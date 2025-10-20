using System.Text.Json;
using Hippo_Exchange.Contracts;
using Hippo_Exchange.Models;
using Hippo_Exchange.Services;
using Hippo_Exchange.Endpoints;
using Isopoh.Cryptography.Argon2;
using MongoDB.Driver;

using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

var builder = WebApplication.CreateBuilder(args);


// Mongo configuration (defaults if not set)
var mongoConnection =
    builder.Configuration.GetValue<string>("Mongo:ConnectionString")
    ?? Environment.GetEnvironmentVariable("MONGODB_CONNECTION")
    ?? "mongodb://localhost:27017";

var mongoDbName =
    builder.Configuration.GetValue<string>("Mongo:Database")
    ?? "HippoExchangeDb";

// Mongo services
builder.Services.AddSingleton<IMongoClient>(_ => new MongoClient(mongoConnection));
builder.Services.AddScoped(sp => sp.GetRequiredService<IMongoClient>().GetDatabase(mongoDbName));

builder.Services.AddScoped<IMongoCollection<Users>>(sp => sp.GetRequiredService<IMongoDatabase>().GetCollection<Users>("users"));
builder.Services.AddScoped<IUserService, UserService>();

builder.Services.AddScoped<IMongoCollection<Item>>(sp => sp.GetRequiredService<IMongoDatabase>().GetCollection<Item>("items"));
builder.Services.AddScoped<IItemService, ItemService>();

builder.Services.AddScoped<IMongoCollection<ItemImageSet>>(sp => sp.GetRequiredService<IMongoDatabase>().GetCollection<ItemImageSet>("item_images"));
builder.Services.AddScoped<IItemImageService, ItemImageService>();


// CORS (adjust origins as needed)
builder.Services.AddCors(o =>
{
    o.AddPolicy("Default", p =>
        p.WithOrigins(
			// Testing only, remove in release.
            "http://127.0.0.1:5500",
            "http://localhost:5500",
			// Local desktop at home used to test things on a different device. Please don't remove until release.
            "http://10.77.6.1:46108",
			// Release
            "https://www.hippo-exchange.com:443"
        )
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials()
    );
});

// Cookie-based session auth
builder.Services
    .AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = "hippo.auth";
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = SameSiteMode.Lax;
        // In production behind HTTPS:
        // options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
        options.SlidingExpiration = true;
        options.ExpireTimeSpan = TimeSpan.FromMinutes(30); // inactivity timeout

        // API: return 401 instead of redirect
        options.Events = new CookieAuthenticationEvents
        {
            OnRedirectToLogin = ctx =>
            {
                ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
                return Task.CompletedTask;
            },
            OnRedirectToAccessDenied = ctx =>
            {
                ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
                return Task.CompletedTask;
            }
        };
    });
    builder.Services.AddAuthorizationBuilder()
    .AddPolicy("ItemOwner", policy =>
    {
        policy.Requirements.Add(new OwnershipRequirement());
    });
// Used by the ItemOwner policy.
builder.Services.AddScoped<IAuthorizationHandler, OwnershipHandler>();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();
app.UsePathBase("/api");
app.UseCors("Default");

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseAuthentication();
app.UseAuthorization();

app = AccountEndpoints.map(app);
app = ProfileEndpoints.map(app);
app = ItemEndpoints.map(app);

app.Run();
