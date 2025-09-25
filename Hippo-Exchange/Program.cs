using Hippo_Exchange.Contracts;
using Hippo_Exchange.Models;
using Hippo_Exchange.Services;
using Isopoh.Cryptography.Argon2;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity.Data;
using Microsoft.IdentityModel.Tokens;
using MongoDB.Driver;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Mongo configuration
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

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// OPTIONAL JWT (leave commented until needed)
/*
var jwtKey = builder.Configuration.GetValue<string>("Jwt:Key") ?? "dev-secret-change";
var keyBytes = Encoding.UTF8.GetBytes(jwtKey);
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(keyBytes),
            ClockSkew = TimeSpan.FromMinutes(1)
        };
    });
builder.Services.AddAuthorization();
*/

builder.Services.AddCors(o =>
{
    o.AddPolicy("Default", p =>
        p.WithOrigins(
             "http://127.0.0.1:5500",
             "http://localhost:5500"
        )
        .AllowAnyHeader()
        .AllowAnyMethod()
    );
});

var app = builder.Build();
app.UseCors("Default");

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// app.UseAuthentication();
// app.UseAuthorization();

// Registration Endpoint
app.MapPost("/api/register", async (Hippo_Exchange.Contracts.RegisterRequest req, IUserService users) =>
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

app.MapPost("/api/login", async (Hippo_Exchange.Contracts.LoginRequest req, IUserService users) =>
{
    var normalizedEmail = (req.Email ?? "").Trim().ToLowerInvariant();
    var user = await users.GetByEmailAsync(normalizedEmail);
    if (user is null)
        return Results.Unauthorized();

    if (!Argon2.Verify(user.strPasswordHash, req.Password))
        return Results.Unauthorized();

    string? token = null;

    // Uncomment to issue JWTs
    /*
    var jwtKey = builder.Configuration.GetValue<string>("Jwt:Key") ?? "dev-secret-change";
    var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
    var creds = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);
    var jwt = new System.IdentityModel.Tokens.Jwt.JwtSecurityToken(
        claims: new[]
        {
            new System.Security.Claims.Claim("sub", user.strUserID!),
            new System.Security.Claims.Claim("email", user.strEmail!)
        },
        expires: DateTime.UtcNow.AddMinutes(30),
        signingCredentials: creds
    );
    token = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler().WriteToken(jwt);
    */

    return Results.Ok(new LoginResponse(user.strUserID!, user.strEmail!, token));
})
.WithName("LoginUser")
.WithSummary("Authenticates a user")
.WithDescription("Verifies credentials using Argon2 hash. Optionally returns JWT.")
.Produces<LoginResponse>(200)
.Produces(401)
.WithOpenApi();

app.Run();