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
    // Recieve a file and return the guid.
    private static async Task<string> RecieveImage(string id, IFormFile file){
            var allowed = new[] { "image/png", "image/jpeg", "image/jpg", "image/gif" };
            var normalizedType = file.ContentType == "image/jpg" ? "image/jpeg" : file.ContentType;
            if (!allowed.Contains(normalizedType)) return "";
	    string img_guid = Guid.NewGuid().ToString("n");
            // Simple local storage (adjust pathing / storage strategy as needed)
            string uploadsDir = "/usr/local/share/HippoAPI/uploads/items";
	    string ItemDir = Path.Combine(uploadsDir, id);
            var filePath = Path.Combine(ItemDir, img_guid + ".png");
            await using (var stream = File.Create(filePath))
                await file.CopyToAsync(stream);
	    return img_guid;
    }
    private static void DeleteImageFile(string filePath){
	    if (System.IO.File.Exists(filePath))
            {
                try { System.IO.File.Delete(filePath); } catch { /* ignore */ }
            }
    }
    private static async Task RemoveImageAsync(string id, string url){
            var uploadsDir = Path.Combine("/usr/local/share/HippoAPI/uploads/items");
            var filePath = Path.Combine(uploadsDir, id, url + ".png");
	    await Task.Run(() => DeleteImageFile(filePath));
    }
    public static Microsoft.AspNetCore.Builder.WebApplication map(Microsoft.AspNetCore.Builder.WebApplication app){
	JsonSerializerOptions wd = new(JsonSerializerDefaults.Web); // Default settings for json serialization.
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
	    List<Task<string>> uploads = new List<Task<string>>();
	    List<string> img_ids = new List<string>();
	    List<string> img_urls = new List<string>();
            // Simple local storage (adjust pathing / storage strategy as needed)
            string uploadsDir = "/usr/local/share/HippoAPI/uploads/items";
	    string ItemDir = Path.Combine(uploadsDir, id);
	    Directory.CreateDirectory(ItemDir);
	    // Recieve each file.
	    foreach (IFormFile f in form.Files){
		uploads.Add(RecieveImage(id, f));
	    }
	    // Get the result of each upload.
	    foreach(Task<string> up in uploads){
		img_ids.Add(await up);
	    }
	    // Parse the resulting list. If it contains an empty string, then something went wrong. Remove ALL files uploaded and return an error.
	    if(img_ids.Contains("")){
		foreach(string did in img_ids){
		    // Delete images in background.
		    _ = RemoveImageAsync(id, did); // Explicitly discards result, removing warning regarding not awaiting.		    
		}		
		return Results.BadRequest(new { message = "Invalid image format!" });
	    }
	    for(int i = 0; i < img_ids.Count; i++){
		string iid = img_ids[i];
		int res = await images.CreateUrlAsync(id, iid);
	    if(res >= 0){
		img_urls.Add($"/uploads/items/{id}/{iid}.png");
	    }
	    else{
		for(int j = i-1; j >= 0; j--){
		    await images.DeleteUrlAsync(id, j);
		}
		// Remove all new image files, ignore errors caused by this.
		foreach(string did in img_ids){
		    // Delete images in background.
		    _ = RemoveImageAsync(id, did); // Explicitly discards result, removing warning regarding not awaiting.		    
		}
		return Results.Json(new {message = $"Image ${i} could not be added to the database."}, wd, "application/json", res * -1);
	    }
	    }
	    return Results.Ok(new { imageUrls = img_urls });
	
	    
	    /*
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
	    */
	    // If nothing went wrong, write to the db.
        })
        .RequireAuthorization("ItemOwner")
        .WithSummary("Upload item image")
        .Produces(200)
        .Produces(400)
        .Produces(401);
		// Item Images


	// Get a list of all images.
	app.MapGet("/api/items/{id}/images", async (string id, HttpContext ctx, IItemImageService images) =>
	{
	    if(string.IsNullOrWhiteSpace(id)) return Results.BadRequest(new {message = "Item ID was missing."});
	    ItemImageSet? imgs = await images.GetByItemId(id);
	    if(imgs is null) return Results.NotFound(new {message = $"The item '{id}' was not found."});
	    List<string> urls = new List<string>();
	    foreach(int pos in imgs.Order){
		int index = imgs.Order[pos];
		//if(index >= imgs.Images.Count) Console.WriteLine($"index {index} was greater than count {imgs.Images.Count}");
		urls.Add(Path.Combine("/uploads/items", id, imgs.Images[index] + ".png"));
	    }
	    return Results.Ok(new {images = urls});
	}).WithSummary("Get a list of all images")
	    .Produces(200)
	    .Produces(400)
	    .Produces(404);
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
	    string oldFilePath = Path.Combine("/usr/local/share/HippoAPI/uploads/items/",id,url + ".png");
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
            string uploadsDir = "/usr/local/share/HippoAPI/uploads/items/";
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
	app.MapGet("/api/items/{id}/images/{index}", async (string id, int index, IItemImageService images) =>
	{
	    if(string.IsNullOrWhiteSpace(id)) return Results.BadRequest();
	    // Get and return the url.
	    string? url = await images.GetImageAsync(id,index);
	    if(url is null)
		return Results.BadRequest();
	    else if(url == "")
		return Results.NotFound();
	    return Results.Ok(new {imageUrl = Path.Combine("/uploads/items/",id,url + ".png")});
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
	    _ = RemoveImageAsync(id, url); // Discards result, suppressing warning about no await.
            return Results.Ok(new { ok = true });
	}).RequireAuthorization("ItemOwner")
	    .WithSummary("Get the image at index.")
	    .Produces(200)
	    .Produces(401)
	    .Produces(404);

        return app;
    }
}
