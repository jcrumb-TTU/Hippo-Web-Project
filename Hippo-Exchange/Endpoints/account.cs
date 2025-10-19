using System.Text.Json;
using Hippo_Exchange.Contracts;
using Hippo_Exchange.Models;
using Hippo_Exchange.Services;
using Isopoh.Cryptography.Argon2;
using MongoDB.Driver;

using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication;
using System.Security.Claims;

namespace Hippo_Exchange.Services;
public class AccountEndpoints{
    public static Microsoft.AspNetCore.Builder.WebApplication map(Microsoft.AspNetCore.Builder.WebApplication app){
    // ---------------- Registration ----------------
    app.MapPost("/register", async (RegisterRequest req, IUserService users) =>
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
        app.MapPost("/login", async (LoginRequest req, IUserService users, HttpContext ctx) =>
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
        app.MapPost("/logout", async (HttpContext ctx) =>
        {
            await ctx.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return Results.Ok(new { message = "Logged out" });
        })
        .WithName("LogoutUser")
        .WithSummary("Logs out the current user")
        .Produces(200);
        
        // ---------------- Session Check ----------------
        app.MapGet("/me", (HttpContext ctx) =>
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
        return app;
    }
}
