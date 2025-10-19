using System.Text.Json;
using Hippo_Exchange.Contracts;
using Hippo_Exchange.Models;
using Hippo_Exchange.Services;
using Isopoh.Cryptography.Argon2;
using MongoDB.Driver;

using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication;
using System.Security.Claims;

namespace Hippo_Exchange.Endpoints;
public class ProfileEndpoints{
    public static Microsoft.AspNetCore.Builder.WebApplication map(Microsoft.AspNetCore.Builder.WebApplication app){
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
        return app;
    }
}
