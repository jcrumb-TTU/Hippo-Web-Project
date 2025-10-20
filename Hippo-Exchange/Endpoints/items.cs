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



public class ItemEndpoints{
    public static Microsoft.AspNetCore.Builder.WebApplication map(Microsoft.AspNetCore.Builder.WebApplication app){
    // Json Seralizer set to web defaults.
    JsonSerializerOptions wd = new(JsonSerializerDefaults.Web);
    // ---------------- Item Endpoints ----------------
        // POST /api/items: Adds a new item for the active user.
        app.MapPost("/items", async (ItemCreateRequest item, HttpContext ctx, IUserService users, IItemService items) =>
        {
        
            var userId = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();
            if (string.IsNullOrEmpty(item.Name)) return Results.Json(new {name = "Item Name Missing"}, wd, "application/json", 400);
            //Task<string> CreateAsync(string ownerUserId, string name, string? description, Dictionary<string, string>? properties);
            ItemCreateResponse res = new(await items.CreateAsync(userId, item.Name, item.Description, item.Properties));
            return Results.Json(res, wd, "application/json", 201);
        }).RequireAuthorization()
            .WithSummary("Upload a new Item")
            .Produces(201) // Item created
            .Produces(400) // Bad form info
            .Produces(401); // Unauthorized
        
        app.MapGet("/items/{id}", async (string id, HttpContext ctx, IItemService items) => {
			Console.WriteLine("Path: " + ctx.Request.Path);
			Console.WriteLine("BasePath" + ctx.Request.PathBase);
            if (string.IsNullOrEmpty(id)) return Results.BadRequest();
            // Try to find the item under {id}.
            Item? i = await items.GetById(id);
            if(i is null){
                return Results.NotFound();
            }
            else{
                ItemCreateRequest res = new(i.Name, i.Description, i.Properties);
                return Results.Json(res, wd, "application/json", 200);
            }
            }).Produces(200) // Here is the item!
            .Produces(400) // Bad request.
            .Produces(404); // Item not found.
        app.MapPut("/items/{id}", async (string id, ItemUpdateRequest inf, HttpContext ctx, IItemService items) => {
	    var userId = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);
	    return Results.StatusCode(await items.UpdateAsync(id, userId, inf.Name, inf.Description, inf.Properties));
        }).RequireAuthorization("ItemOwner")
            .WithSummary("Update the item @ {id}")
            .Produces(201)
            .Produces(400) // Bad request (either the id or info was invalid).
            .Produces(401) // Unauthenticated
            .Produces(403) // Editing an item that isn't yours.
            .Produces(404); // Item not found.
        //Example ID: 43f777b61c7e442595b744a59e2399e7
	app.MapDelete("/items/{id}", async (string id, HttpContext ctx, IItemService items) => {
	    var userId = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);
	    return Results.StatusCode(await items.DeleteAsync(id, userId));
        }).RequireAuthorization("ItemOwner")
            .WithSummary("Remove the item @ {id}")
            .Produces(201)
            .Produces(400) // Bad request (id was invalid/missing).
            .Produces(401) // Unauthenticated
            .Produces(403) // Editing an item that isn't yours.
            .Produces(404); // Item not found.
	// Item Images
	app.MapPost("/items/{id}/images", async (string id, HttpContext ctx, IItemImageService images) =>
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
		var publicUrl = $"/uploads/items/{id}/{img_guid}.png";
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
	app.MapPut("/items/{id}/images/{index}", async (string id, int index, HttpContext ctx, IItemImageService images) =>
        {
	    Console.WriteLine("Checking user id...");
            var userId = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();
	    string? url = await images.GetImageAsync(id, index);
	    if(url is null)
		return Results.BadRequest();
	    else if(url == "")
		return Results.NotFound();
	    string oldFilePath = Path.Combine("/usr/local/share/HippoAPI/uploads/items",id,url + ".png");
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
	    int res = await images.UpdateUrlAsync(id, index, img_guid);
	    if(res == 201){
		var publicUrl = $"/uploads/items/{id}/{img_guid}.png";
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
	app.MapGet("/items/{id}/images/{index}", async (string id, int index, IItemImageService images) =>
	{
	    if(string.IsNullOrWhiteSpace(id)) return Results.BadRequest();
	    // Get and return the url.
	    string? url = await images.GetImageAsync(id,index);
	    if(url is null)
		return Results.BadRequest();
	    else if(url == "")
		return Results.NotFound();
	    return Results.Ok(new {imageUrl = Path.Combine("/uploads/items",id,url + ".png")});
	}).WithSummary("Get the image at index.")
	    .Produces(200)
	    .Produces(401)
	    .Produces(404);
	app.MapDelete("/items/{id}/images/{index}", async (string id, int index, IItemImageService images) =>
	{
	    if(string.IsNullOrWhiteSpace(id)) return Results.BadRequest();
	    // Get and return the url.
	    string? url = await images.GetImageAsync(id,index);
	    if(url is null)
		return Results.BadRequest();
	    else if(url == "")
		return Results.NotFound();
	    int res = await images.DeleteUrlAsync(id, index);
        
            var uploadsDir = Path.Combine("/usr/local/share/HippoAPI/uploads/items");
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
