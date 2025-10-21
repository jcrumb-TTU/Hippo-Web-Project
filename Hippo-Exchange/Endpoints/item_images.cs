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



public class ItemImageEndpoints{
    public static Microsoft.AspNetCore.Builder.WebApplication map(Microsoft.AspNetCore.Builder.WebApplication app){
	// Item Images
	app.MapPost("/api/items/{id}/images", async (string id, HttpContext ctx, IItemImageService images) =>
        {
	    Console.WriteLine("Checking user id...");
            var userId = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();
	    Console.WriteLine("Starting file upload?");
	    // Handle the file upload.
            if (!ctx.Request.HasFormContentType) return Results.BadRequest(new { message = "Expected multipart/form-data." });
	    var form = await ctx.Request.ReadFormAsync();
	    var file = form.Files.FirstOrDefault();
	    Console.WriteLine("Finished file upload?");
            if (file == null) return Results.BadRequest(new { message = "No file uploaded." });
            var allowed = new[] { "image/png", "image/jpeg", "image/jpg", "image/gif" };
            var normalizedType = file.ContentType == "image/jpg" ? "image/jpeg" : file.ContentType;
            if (!allowed.Contains(normalizedType)) return Results.BadRequest(new { message = "Unsupported file type." });
            // Simple local storage (adjust pathing / storage strategy as needed)
            string uploadsDir = "/usr/local/share/HippoAPI/uploads/items";
	    string ItemDir = Path.Combine(uploadsDir, id);
	    Directory.CreateDirectory(ItemDir);
	    string img_guid = Guid.NewGuid().ToString("n");
            var filePath = Path.Combine(ItemDir, img_guid + ".png");
            await using (var stream = File.Create(filePath))
                await file.CopyToAsync(stream);
	    // If nothing went wrong, write to the db.
	    int res = await images.CreateUrlAsync(id, img_guid);
	    if(res >= 0){
		var publicUrl = $"/uploads/api/items/{id}/{img_guid}.png";
		return Results.Ok(new { imageUrl = publicUrl });
	    }
	    return Results.StatusCode(res * -1);
        })
        .RequireAuthorization("ItemOwner")
        .WithSummary("Upload item image")
        .Produces(200)
        .Produces(400)
        .Produces(401);
		// Item Images



	app.MapPut("/api/items/{id}/images/{index}", async (string id, int index, HttpContext ctx, IItemImageService images) =>
        {
	    Console.WriteLine("Checking user id...");
            var userId = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();
	    string? url = await images.GetImageAsync(id, index);
	    if(url is null)
		return Results.BadRequest();
	    else if(url == "")
		return Results.NotFound();
	    string oldFilePath = Path.Combine("/usr/local/share/HippoAPI/uploads/api/items",id,url + ".png");
	    // Handle the file upload.
            if (!ctx.Request.HasFormContentType) return Results.BadRequest(new { message = "Expected multipart/form-data." });
	    var form = await ctx.Request.ReadFormAsync();
	    var file = form.Files.FirstOrDefault();
	    Console.WriteLine("Finished file upload?");
            if (file == null) return Results.BadRequest(new { message = "No file uploaded." });
            var allowed = new[] { "image/png", "image/jpeg", "image/jpg", "image/gif" };
            var normalizedType = file.ContentType == "image/jpg" ? "image/jpeg" : file.ContentType;
            if (!allowed.Contains(normalizedType)) return Results.BadRequest(new { message = "Unsupported file type." });
            // Simple local storage (adjust pathing / storage strategy as needed)
            string uploadsDir = "/usr/local/share/HippoAPI/uploads/api/items";
	    string ItemDir = Path.Combine(uploadsDir, id);
	    Directory.CreateDirectory(ItemDir);
	    string img_guid = Guid.NewGuid().ToString("n");
            var filePath = Path.Combine(ItemDir, img_guid + ".png");
            await using (var stream = File.Create(filePath))
                await file.CopyToAsync(stream);
	    // If nothing went wrong, write to the db.
	    int res = await images.UpdateUrlAsync(id, index, img_guid);
	    if(res == 201){
		var publicUrl = $"/uploads/api/items/{id}/{img_guid}.png";
		if (System.IO.File.Exists(oldFilePath))
		{
		    try { System.IO.File.Delete(oldFilePath); } catch { /* ignore */ }
		}
		return Results.Ok(new { imageUrl = publicUrl });
	    }
	    else{
		if (System.IO.File.Exists(filePath))
		{
		    try { System.IO.File.Delete(filePath); } catch { /* ignore */ }
		}
		return Results.StatusCode(res);
	    }
        })
        .RequireAuthorization("ItemOwner")
        .WithSummary("Update an item image")
        .Produces(200)
        .Produces(400)
        .Produces(401);
	app.MapGet("/api/items/{id}/images/{index}", async (string id, int index, IItemImageService images) =>
	{
	    if(string.IsNullOrWhiteSpace(id)) return Results.BadRequest();
	    // Get and return the url.
	    string? url = await images.GetImageAsync(id,index);
	    if(url is null)
		return Results.BadRequest();
	    else if(url == "")
		return Results.NotFound();
	    return Results.Ok(new {imageUrl = Path.Combine("/uploads/api/items",id,url + ".png")});
	}).WithSummary("Get the image at index.")
	    .Produces(200)
	    .Produces(401)
	    .Produces(404);
	app.MapDelete("/api/items/{id}/images/{index}", async (string id, int index, IItemImageService images) =>
	{
	    if(string.IsNullOrWhiteSpace(id)) return Results.BadRequest();
	    // Get and return the url.
	    string? url = await images.GetImageAsync(id,index);
	    if(url is null)
		return Results.BadRequest();
	    else if(url == "")
		return Results.NotFound();
	    int res = await images.DeleteUrlAsync(id, index);
        
            var uploadsDir = Path.Combine("/usr/local/share/HippoAPI/uploads/api/items");
            var filePath = Path.Combine(uploadsDir, id, url + ".png");
            if (System.IO.File.Exists(filePath))
            {
                try { System.IO.File.Delete(filePath); } catch { /* ignore */ }
            }
            return Results.Ok(new { ok = true });
	}).RequireAuthorization("ItemOwner")
	    .WithSummary("Get the image at index.")
	    .Produces(200)
	    .Produces(401)
	    .Produces(404);

        return app;
    }
}
