using MongoDB.Driver;
using Isopoh.Cryptography.Argon2;
using Hippo_Exchange.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

// Minimal API bootstrap
var builder = WebApplication.CreateBuilder(args);

// Config (env override example)
var mongoConnection = builder.Configuration.GetValue<string>("Mongo:ConnectionString")
                      ?? Environment.GetEnvironmentVariable("MONGODB_CONNECTION")
                      ?? "mongodb://localhost:27017";
var mongoDbName = builder.Configuration.GetValue<string>("Mongo:Database") ?? "HippoExchangeDb";

// Mongo client & collections (singleton-ish)
builder.Services.AddSingleton<IMongoClient>(_ => new MongoClient(mongoConnection));
builder.Services.AddScoped(sp => sp.GetRequiredService<IMongoClient>().GetDatabase(mongoDbName));
builder.Services.AddScoped<IMongoCollection<Users>>(sp =>
    sp.GetRequiredService<IMongoDatabase>().GetCollection<Users>("users"));

// User service
builder.Services.AddScoped<IUserService, UserService>();

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// (Optional) JWT Auth setup (uncomment when enabling auth protection)
/*
var jwtKey = builder.Configuration.GetValue<string>("Jwt:Key") ?? "dev-secret-change";
var keyBytes = Encoding.UTF8.GetBytes(jwtKey);
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options => {
        options.TokenValidationParameters = new TokenValidationParameters {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(keyBytes),
            ClockSkew = TimeSpan.FromMinutes(1)
        };
    });
builder.Services.AddAuthorization();
*/

builder.Services.AddCors(o => {
    o.AddPolicy("Default", p =>
        p.WithOrigins("http://localhost:80")
         .AllowAnyHeader()
         .AllowAnyMethod());
});

var app = builder.Build();
app.UseCors("Default");

// Swagger UI in Dev
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// app.UseAuthentication();
// app.UseAuthorization();

// DTOs
record RegisterRequest(string fname, string lname, string bday, string email, string phone, string password, string confirm_password, bool terms);
record RegisterResponse(string userId, string email);
record LoginRequest(string email, string password);
record LoginResponse(string userId, string email, string? token);

// Registration Endpoint
app.MapPost("/api/register", async (RegisterRequest req, IUserService users) =>
{
    // Basic validation (could be extended or replaced with FluentValidation)
    var problems = new Dictionary<string,string>();

    if (string.IsNullOrWhiteSpace(req.fname)) problems["fname"] = "First name required.";
    if (string.IsNullOrWhiteSpace(req.lname)) problems["lname"] = "Last name required.";
    if (string.IsNullOrWhiteSpace(req.email)) problems["email"] = "Email required.";
    if (string.IsNullOrWhiteSpace(req.password)) problems["password"] = "Password required.";
    if (req.password != req.confirm_password) problems["confirm_password"] = "Passwords do not match.";
    if (!req.terms) problems["terms"] = "Terms must be accepted.";

    if (problems.Count > 0)
        return Results.ValidationProblem(problems);

    if (await users.EmailExistsAsync(req.email))
        return Results.Conflict(new { message = "Email already in use." });

    var user = new Users {
        strFirstName = req.fname.Trim(),
        strLastName = req.lname.Trim(),
        strEmail = req.email.Trim().ToLowerInvariant(),
        strPhoneNumber = req.phone?.Trim(),
        strBirthday = req.bday?.Trim()
    };
    user.SetPassword(req.password);

    var id = await users.CreateAsync(user);

    return Results.Created($"/api/users/{id}", new RegisterResponse(id, user.strEmail!));
})
.WithName("RegisterUser")
.WithSummary("Creates a new user")
.WithDescription("Validates input, hashes password (Argon2), and stores user in MongoDB.")
.Produces<RegisterResponse>(201)
.ProducesProblem(400)
.Produces(409)
.WithOpenApi();

// Login Endpoint
app.MapPost("/api/login", async (LoginRequest req, IUserService users) =>
{
    var normalizedEmail = (req.email ?? "").Trim().ToLowerInvariant();
    var user = await users.GetByEmailAsync(normalizedEmail);
    if (user is null)
        return Results.Unauthorized();

    if (!Argon2.Verify(user.strPasswordHash, req.password))
        return Results.Unauthorized();

    // (Optional) create JWT token here if auth enabled
    string? token = null;
    /*
    var jwtKey = builder.Configuration.GetValue<string>("Jwt:Key") ?? "dev-secret-change";
    var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
    var creds = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);
    var jwt = new JwtSecurityToken(
        claims: new[] {
            new System.Security.Claims.Claim("sub", user.strUserID!),
            new System.Security.Claims.Claim("email", user.strEmail!)
        },
        expires: DateTime.UtcNow.AddMinutes(30),
        signingCredentials: creds
    );
    token = new JwtSecurityTokenHandler().WriteToken(jwt);
    */

    return Results.Ok(new LoginResponse(user.strUserID!, user.strEmail!, token));
})
.WithName("LoginUser")
.WithSummary("Authenticates a user")
.WithDescription("Verifies email and password (Argon2). Optionally issues a JWT token.")
.Produces<LoginResponse>(200)
.Produces(401)
.WithOpenApi();

// Sample existing endpoint preserved
app.MapGet("/api/search", () =>
{
    return Results.Json(SampleItems.MakeSamples());
})
.WithSummary("Sample items")
.WithDescription("Returns sample items (demo).")
.Produces<IEnumerable<SampleItems.Item>>(200)
.WithOpenApi();

app.Run();

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
        // Ensure unique index on email (idempotent)
        var indexKeys = Builders<Users>.IndexKeys.Ascending(u => u.strEmail);
        var indexModel = new CreateIndexModel<Users>(indexKeys, new CreateIndexOptions { Unique = true });
        _users.Indexes.CreateOne(indexModel);
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