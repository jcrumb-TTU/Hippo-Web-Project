
using Hippo_Exchange.Contracts;
using Hippo_Exchange.Models;
using Hippo_Exchange.Services;
using Isopoh.Cryptography.Argon2;
using MongoDB.Driver;

using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication;
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
builder.Services.AddScoped<IMongoCollection<Users>>(sp =>
    sp.GetRequiredService<IMongoDatabase>().GetCollection<Users>("users"));

builder.Services.AddScoped<IUserService, UserService>();

// CORS (adjust origins as needed)
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

builder.Services.AddAuthorization();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

app.UseCors("Default");

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseAuthentication();
app.UseAuthorization();

// ---------------- Registration ----------------
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

    Console.WriteLine($"[REGISTER] Checking email: '{normalizedEmail}'");

    if (await users.EmailExistsAsync(normalizedEmail))
        return Results.Conflict(new { message = "Email already in use." });
        Console.WriteLine($"[EmailExistsAsync] Querying for '{normalizedEmail}'");

    var user = new Users
    {
        strFirstName = req.FirstName.Trim(),
        strLastName = req.LastName.Trim(),
        strEmail = normalizedEmail,
        strPhoneNumber = req.Phone?.Trim(),
        strBirthday = req.Birthday?.Trim()
        // Bio & PhotoUrl empty until user sets them
    };
    user.SetPassword(req.Password);

    var userId = await users.CreateAsync(user);

    return Results.Created($"/api/users/{userId}", new RegisterResponse(userId, user.strEmail!));
})
.WithName("RegisterUser")
.WithSummary("Creates a new user")
.Produces<RegisterResponse>(201)
.ProducesProblem(400)
.Produces(409);

// ---------------- Login ----------------
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
        new Claim(ClaimTypes.NameIdentifier, user.strUserID ?? ""),
        new Claim(ClaimTypes.Email, user.strEmail ?? ""),
        new Claim(ClaimTypes.Name, $"{user.strFirstName} {user.strLastName}".Trim())
    };

    var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
    var principal = new ClaimsPrincipal(identity);
    await ctx.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, principal);

    // Returning email/id; token field left null since cookies are used.
    return Results.Ok(new LoginResponse(user.strUserID!, user.strEmail!, Token: null));
})
.WithName("LoginUser")
.WithSummary("Authenticates a user and issues an auth cookie")
.Produces<LoginResponse>(200)
.Produces(401);

// ---------------- Logout ----------------
app.MapPost("/api/logout", async (HttpContext ctx) =>
{
    await ctx.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
    return Results.Ok(new { message = "Logged out" });
})
.WithName("LogoutUser")
.WithSummary("Logs out the current user")
.Produces(200);

// ---------------- Session Check ----------------
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
.Produces(200)
.Produces(401);

// ---------------- Profile Endpoints (NEW) ----------------
app.MapGet("/api/user/profile", async (HttpContext ctx, IUserService users) =>
{
    var userId = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);
    if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();
    var user = await users.GetByIdAsync(userId);
    if (user == null) return Results.NotFound();
    return Results.Ok(new { bio = user.Bio, photoUrl = user.PhotoUrl });
})
.RequireAuthorization()
.WithSummary("Get current user profile")
.Produces(200)
.Produces(401)
.Produces(404);

app.MapPut("/api/user/profile", async (HttpContext ctx, IUserService users, UserProfileUpdateRequest req) =>
{
    var userId = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);
    if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

    // Basic length constraint (server-side) — adjust as needed
    if (req.Bio?.Length > 500)
        return Results.ValidationProblem(new Dictionary<string, string[]>
        {
            ["Bio"] = new[] { "Bio must be 500 characters or fewer." }
        });

    var ok = await users.UpdateBioAsync(userId, req.Bio);
    return ok ? Results.Ok(new { bio = req.Bio }) : Results.NotFound();
})
.RequireAuthorization()
.WithSummary("Update current user bio")
.Produces(200)
.ProducesProblem(400)
.Produces(401)
.Produces(404);

app.MapPost("/api/user/profile/photo", async (HttpContext ctx, IUserService users) =>
{
    var userId = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);
    if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

    if (!ctx.Request.HasFormContentType)
        return Results.BadRequest(new { message = "Expected multipart/form-data." });

    var form = await ctx.Request.ReadFormAsync();
    var file = form.Files.FirstOrDefault();
    if (file == null) return Results.BadRequest(new { message = "No file uploaded." });

    var allowed = new[] { "image/png", "image/jpeg", "image/jpg", "image/gif" };
    var normalizedType = file.ContentType == "image/jpg" ? "image/jpeg" : file.ContentType;
    if (!allowed.Contains(normalizedType))
        return Results.BadRequest(new { message = "Unsupported file type." });

    // Simple local storage (adjust pathing / storage strategy as needed)
    var uploadsDir = Path.Combine(app.Environment.ContentRootPath, "wwwroot", "uploads", userId);
    Directory.CreateDirectory(uploadsDir);
    var filePath = Path.Combine(uploadsDir, "avatar.png");
    await using (var stream = File.Create(filePath))
        await file.CopyToAsync(stream);

    var publicUrl = $"/uploads/{userId}/avatar.png";
    await users.UpdatePhotoUrlAsync(userId, publicUrl);
    return Results.Ok(new { imageUrl = publicUrl });
})
.RequireAuthorization()
.WithSummary("Upload profile photo")
.Produces(200)
.Produces(400)
.Produces(401);

app.MapDelete("/api/user/profile/photo", async (HttpContext ctx, IUserService users) =>
{
    var userId = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);
    if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

    await users.UpdatePhotoUrlAsync(userId, null);

    // (Optional) remove file from disk
    var filePath = Path.Combine(app.Environment.ContentRootPath, "wwwroot", "uploads", userId, "avatar.png");
    if (System.IO.File.Exists(filePath))
    {
        try { System.IO.File.Delete(filePath); } catch { /* ignore */ }
    }

    return Results.Ok(new { ok = true });
})
.RequireAuthorization()
.WithSummary("Remove profile photo")
.Produces(200)
.Produces(401);

app.Run();