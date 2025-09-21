using System.Text;
using Isopoh.Cryptography.Argon2;
using MongoDB.Driver;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Hippo_Exchange.Models;

// ------------------------------------------------------------
// Minimal API bootstrap
// ------------------------------------------------------------
var builder = WebApplication.CreateBuilder(args);

// ------------------------------------------------------------
// Configuration (environment or appsettings.json)
// MONGODB_CONNECTION can override the configured connection string.
// ------------------------------------------------------------
var mongoConnection =
    builder.Configuration.GetValue<string>("Mongo:ConnectionString")
    ?? Environment.GetEnvironmentVariable("MONGODB_CONNECTION")
    ?? "mongodb://localhost:27017";

var mongoDbName =
    builder.Configuration.GetValue<string>("Mongo:Database")
    ?? "HippoExchangeDb";

// ------------------------------------------------------------
// MongoDB Services
// ------------------------------------------------------------
builder.Services.AddSingleton<IMongoClient>(_ => new MongoClient(mongoConnection));
builder.Services.AddScoped(sp => sp.GetRequiredService<IMongoClient>().GetDatabase(mongoDbName));
builder.Services.AddScoped<IMongoCollection<Users>>(sp =>
    sp.GetRequiredService<IMongoDatabase>().GetCollection<Users>("users"));

// Domain services
builder.Services.AddScoped<IUserService, UserService>();

// ------------------------------------------------------------
// Swagger / OpenAPI
// ------------------------------------------------------------
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// ------------------------------------------------------------
// (Optional) JWT Authentication scaffolding
// Uncomment this block + the middleware calls below to enable JWT.
// ------------------------------------------------------------
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

// ------------------------------------------------------------
// CORS (adjust allowed origins as needed)
// ------------------------------------------------------------
builder.Services.AddCors(o =>
{
    o.AddPolicy("Default", p =>
        p.WithOrigins("http://localhost:80")
         .AllowAnyHeader()
         .AllowAnyMethod());
});

var app = builder.Build();
app.UseCors("Default");

// Enable Swagger UI in Development
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Uncomment when JWT auth is enabled
// app.UseAuthentication();
// app.UseAuthorization();

// ------------------------------------------------------------
// DTO Records
// ------------------------------------------------------------
record RegisterRequest(
    string FirstName,
    string LastName,
    string Birthday,
    string Email,
    string Phone,
    string Password,
    string ConfirmPassword,
    bool Terms);

record RegisterResponse(string UserId, string Email);

record LoginRequest(string Email, string Password);

record LoginResponse(string UserId, string Email, string? Token);

// ------------------------------------------------------------
// Registration Endpoint
// ------------------------------------------------------------
app.MapPost("/api/register", async (RegisterRequest req, IUserService users) =>
{
    var problems = new Dictionary<string, string[]>();

    if (string.IsNullOrWhiteSpace(req.FirstName)) problems["FirstName"] = ["First name required."];
    if (string.IsNullOrWhiteSpace(req.LastName)) problems["LastName"] = ["Last name required."];
    if (string.IsNullOrWhiteSpace(req.Email)) problems["Email"] = ["Email required."];
    if (string.IsNullOrWhiteSpace(req.Password)) problems["Password"] = ["Password required."];
    if (req.Password != req.ConfirmPassword) problems["ConfirmPassword"] = ["Passwords do not match."];
    if (!req.Terms) problems["Terms"] = ["Terms must be accepted."];

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

// ------------------------------------------------------------
// Login Endpoint
// ------------------------------------------------------------
app.MapPost("/api/login", async (LoginRequest req, IUserService users) =>
{
    var normalizedEmail = (req.Email ?? "").Trim().ToLowerInvariant();
    var user = await users.GetByEmailAsync(normalizedEmail);
    if (user is null)
        return Results.Unauthorized();

    if (!Argon2.Verify(user.strPasswordHash, req.Password))
        return Results.Unauthorized();

    string? token = null;
    // Uncomment this block when JWT is enabled
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

// ------------------------------------------------------------
// Run
// ------------------------------------------------------------
app.Run();

// ------------------------------------------------------------
// User Service Abstractions (kept here for simplicity)
// Consider moving to /Services/UserService.cs as project grows.
// ------------------------------------------------------------
public interface IUserService
{
    Task<bool> EmailExistsAsync(string email);
    Task<string> CreateAsync(Users user);
    Task<Users?> GetByEmailAsync(string email);
}

public class UserService : IUserService
{
    private readonly IMongoCollection<Users> _users;

    public UserService(IMongoCollection<Users> users)
    {
        _users = users;
        EnsureIndexesAsync().GetAwaiter().GetResult();
    }

    private async Task EnsureIndexesAsync()
    {
        // Idempotent unique index on Email
        var indexKeys = Builders<Users>.IndexKeys.Ascending(u => u.strEmail);
        var indexModel = new CreateIndexModel<Users>(indexKeys, new CreateIndexOptions { Unique = true });
        await _users.Indexes.CreateOneAsync(indexModel);
    }

    public async Task<bool> EmailExistsAsync(string email)
    {
        var filter = Builders<Users>.Filter.Eq(u => u.strEmail, email);
        return await _users.Find(filter).AnyAsync();
    }

    public async Task<string> CreateAsync(Users user)
    {
        user.strUserID = Guid.NewGuid().ToString("n");
        await _users.InsertOneAsync(user);
        return user.strUserID!;
    }

    public async Task<Users?> GetByEmailAsync(string email)
    {
        var filter = Builders<Users>.Filter.Eq(u => u.strEmail, email);
        return await _users.Find(filter).FirstOrDefaultAsync();
    }
}