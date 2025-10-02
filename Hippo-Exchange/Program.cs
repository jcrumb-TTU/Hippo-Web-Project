using Hippo_Exchange.Contracts;
using Hippo_Exchange.Models;
using Hippo_Exchange.Services;
using Isopoh.Cryptography.Argon2;
using MongoDB.Driver;

// Cookie auth
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication;
using System.Security.Claims;

var builder = WebApplication.CreateBuilder(args);

// Mongo configuration (as in mongo_api_test)
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
builder.Services.AddScoped<IMongoCollection<Users>>(sp =>
    sp.GetRequiredService<IMongoDatabase>().GetCollection<Users>("users"));

// Domain services
builder.Services.AddScoped<IUserService, UserService>();

// Items collection + service
builder.Services.AddScoped<IMongoCollection<Item>>(sp =>
    sp.GetRequiredService<IMongoDatabase>().GetCollection<Item>("items"));
builder.Services.AddScoped<IItemService, ItemService>();

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// CORS (dev)
builder.Services.AddCors(o =>
{
    o.AddPolicy("Default", p =>
        p.WithOrigins(
             "http://127.0.0.1:5500",
             "http://localhost:5500"
        )
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials()
    );
});

// Cookie authentication (simple, dev-safe; enable Secure in HTTPS)
builder.Services
    .AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = "hippo.auth";
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = SameSiteMode.Lax;      // Strict if same-site only; None+Secure if cross-site
        options.Cookie.SecurePolicy = CookieSecurePolicy.None; // Use Always in HTTPS
        options.SlidingExpiration = true;
        options.ExpireTimeSpan = TimeSpan.FromHours(2);
        options.LoginPath = "/api/login";
        options.LogoutPath = "/api/logout";

        // API-friendly: don’t redirect on 401/403
        options.Events = new CookieAuthenticationEvents
        {
            OnRedirectToLogin = ctx => { ctx.Response.StatusCode = StatusCodes.Status401Unauthorized; return Task.CompletedTask; },
            OnRedirectToAccessDenied = ctx => { ctx.Response.StatusCode = StatusCodes.Status403Forbidden; return Task.CompletedTask; }
        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();

app.UseCors("Default");

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseAuthentication();
app.UseAuthorization();

// ----------------- Auth -----------------

// Register (JSON Contract)
app.MapPost("/api/register", async (RegisterRequest req, IUserService users) =>
{
    var problems = new Dictionary<string, string[]>();

    if (string.IsNullOrWhiteSpace(req.FirstName)) problems["FirstName"] = new[] { "First name required." };
    if (string.IsNullOrWhiteSpace(req.LastName)) problems["LastName"] = new[] { "Last name required." };
    if (string.IsNullOrWhiteSpace(req.Email)) problems["Email"] = new[] { "Email required." };
    if (string.IsNullOrWhiteSpace(req.Password)) problems["Password"] = new[] { "Password required." };
    if (req.Password != req.ConfirmPassword) problems["ConfirmPassword"] = new[] { "Passwords do not match." };
    if (!req.Terms) problems["Terms"] = new[] { "Terms must be accepted." };

    if (problems.Count > 0)
        return Results.ValidationProblem(problems);

    var normalizedEmail = req.Email.Trim().ToLowerInvariant();
    if (await users.EmailExistsAsync(normalizedEmail))
        return Results.Conflict(new { message = "Email already in use." });

    var user = new Users
    {
        strFirstName = req.FirstName.Trim(),
        strLastName = req.LastName.Trim(),
        strEmail = normalizedEmail,
        strPhoneNumber = req.Phone?.Trim(),
        strBirthday = req.Birthday?.Trim()
    };
    user.SetPassword(req.Password);

    var userId = await users.CreateAsync(user);

    return Results.Created($"/api/users/{userId}", new RegisterResponse(userId, user.strEmail!));
})
.WithName("RegisterUser")
.WithSummary("Creates a new user")
.WithDescription("Validates input, hashes password (Argon2), stores user in MongoDB.")
.Produces<RegisterResponse>(201)
.ProducesProblem(400)
.Produces(409)
.WithOpenApi();

// Login: verify password, then issue auth cookie
app.MapPost("/api/login", async (LoginRequest req, IUserService users, HttpContext ctx) =>
{
    var normalizedEmail = (req.Email ?? "").Trim().ToLowerInvariant();
    var user = await users.GetByEmailAsync(normalizedEmail);
    if (user is null || string.IsNullOrWhiteSpace(user.strPasswordHash))
        return Results.Unauthorized();

    if (!Argon2.Verify(user.strPasswordHash, req.Password))
        return Results.Unauthorized();

    var claims = new List<Claim>
    {
        new Claim(ClaimTypes.NameIdentifier, user.strUserID ?? string.Empty),
        new Claim(ClaimTypes.Email, user.strEmail ?? string.Empty),
        new Claim(ClaimTypes.Name, $"{user.strFirstName} {user.strLastName}".Trim())
    };
    var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
    var principal = new ClaimsPrincipal(identity);

    await ctx.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, principal);

    // Response body is optional; front-end can just redirect on 200
    return Results.Ok(new LoginResponse(user.strUserID!, user.strEmail!, Token: null));
})
.WithName("LoginUser")
.WithSummary("Authenticates a user and issues an auth cookie")
.WithDescription("Verifies credentials using Argon2 hash and signs in via cookie.")
.Produces<LoginResponse>(200)
.Produces(401)
.WithOpenApi();

// Logout: clear cookie-backed session
app.MapPost("/api/logout", async (HttpContext ctx) =>
{
    await ctx.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
    return Results.Ok(new { message = "Logged out" });
})
.WithName("LogoutUser")
.WithSummary("Logs out the current user")
.WithDescription("Clears the authentication cookie.")
.Produces(200)
.WithOpenApi();

// Current user
app.MapGet("/api/me", (HttpContext ctx) =>
{
    if (!(ctx.User.Identity?.IsAuthenticated ?? false))
        return Results.Unauthorized();

    var id = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);
    var name = ctx.User.FindFirstValue(ClaimTypes.Name) ?? "";
    var email = ctx.User.FindFirstValue(ClaimTypes.Email) ?? "";
    return Results.Ok(new { id, name, email });
})
.RequireAuthorization()
.WithName("CurrentUser")
.WithSummary("Returns the current authenticated user")
.WithDescription("Requires an auth cookie.")
.Produces(200)
.Produces(401)
.WithOpenApi();

// ----------------- Items (for dashboard create/manage) -----------------

var items = app.MapGroup("/api/items").RequireAuthorization();

// Create item
items.MapPost("/", async (ItemCreateRequest req, IItemService svc, HttpContext ctx) =>
{
    var ownerId = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);
    if (string.IsNullOrWhiteSpace(ownerId)) return Results.Unauthorized();

    if (string.IsNullOrWhiteSpace(req.Name))
        return Results.ValidationProblem(new Dictionary<string, string[]>
        {
            ["Name"] = new[] { "Name is required." }
        });

    var id = await svc.CreateAsync(ownerId, req.Name.Trim(), req.Description?.Trim(), req.Properties);
    return Results.Created($"/api/items/{id}", new { id });
})
.WithSummary("Create an item")
.WithDescription("Creates a new item owned by the current user.")
.Produces(201)
.ProducesProblem(400)
.Produces(401)
.WithOpenApi();

// List current user's items
items.MapGet("/", async (IItemService svc, HttpContext ctx) =>
{
    var ownerId = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);
    if (string.IsNullOrWhiteSpace(ownerId)) return Results.Unauthorized();

    var results = await svc.GetForOwnerAsync(ownerId);
    return Results.Ok(results);
})
.WithSummary("List my items")
.WithDescription("Returns items owned by the current user.")
.Produces<IEnumerable<Item>>(200)
.Produces(401)
.WithOpenApi();

// Get one item by id (must belong to user)
items.MapGet("/{id}", async (string id, IItemService svc, HttpContext ctx) =>
{
    var ownerId = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);
    if (string.IsNullOrWhiteSpace(ownerId)) return Results.Unauthorized();

    var item = await svc.GetByIdForOwnerAsync(id, ownerId);
    return item is null ? Results.NotFound() : Results.Ok(item);
})
.WithSummary("Get item")
.WithDescription("Gets a single item by id (owner only).")
.Produces<Item>(200)
.Produces(401)
.Produces(404)
.WithOpenApi();

// Update item (owner only)
items.MapPut("/{id}", async (string id, ItemUpdateRequest req, IItemService svc, HttpContext ctx) =>
{
    var ownerId = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);
    if (string.IsNullOrWhiteSpace(ownerId)) return Results.Unauthorized();

    var ok = await svc.UpdateAsync(id, ownerId, req.Name?.Trim(), req.Description?.Trim(), req.Properties);
    return ok ? Results.NoContent() : Results.NotFound();
})
.WithSummary("Update item")
.WithDescription("Updates name/description/properties of an item (owner only).")
.Produces(204)
.Produces(401)
.Produces(404)
.WithOpenApi();

// Delete item (owner only)
items.MapDelete("/{id}", async (string id, IItemService svc, HttpContext ctx) =>
{
    var ownerId = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);
    if (string.IsNullOrWhiteSpace(ownerId)) return Results.Unauthorized();

    var ok = await svc.DeleteAsync(id, ownerId);
    return ok ? Results.NoContent() : Results.NotFound();
})
.WithSummary("Delete item")
.WithDescription("Deletes an item by id (owner only).")
.Produces(204)
.Produces(401)
.Produces(404)
.WithOpenApi();

app.Run();