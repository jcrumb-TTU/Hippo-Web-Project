using System.Text.Json;
using Microsoft.AspNetCore.Mvc;


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
    private static ItemGetResponse mapResponseObject(Item item, IItemImageService images){
                var maintenanceTasks = new List<MaintenanceTask>();
                // Parse maintenance tasks from properties if they exist
                if (item.Properties != null && item.Properties.ContainsKey("maintenanceTasks"))
                {
                    try
                    {
                        var tasksJson = item.Properties["maintenanceTasks"];
                        var tasks = JsonSerializer.Deserialize<List<Dictionary<string, string>>>(tasksJson);
                        if (tasks != null)
                        {
                            maintenanceTasks = tasks.Select(t => new MaintenanceTask(
                                t.ContainsKey("description") ? t["description"] : "",
                                t.ContainsKey("frequency") ? t["frequency"] : "",
                                t.ContainsKey("materials") ? t["materials"] : "",
                                t.ContainsKey("tools") ? t["tools"] : ""
			    )).ToList();
                        }
                    }
                    catch { /* ignore parse errors */ }
                }
		ItemMaintenance mobj = new ItemMaintenance(maintenanceTasks.Count > 0 ? "Various" : "N/A", maintenanceTasks.ToArray());
		string? thumb_id = images.GetImageAsync(item.Id, 0).GetAwaiter().GetResult();
                return new ItemGetResponse(
                    item.Id,
                    item.Name,
                    item.Description ?? "",
                    (string.IsNullOrWhiteSpace(thumb_id)) ? "https://placehold.co/600x400?text=" + Uri.EscapeDataString(item.Name) : Path.Combine("/uploads/items",item.Id, thumb_id + ".png"),
                    new string[] { },
                    mobj
                );
    }
    public static Microsoft.AspNetCore.Builder.WebApplication map(Microsoft.AspNetCore.Builder.WebApplication app){
    // Json Seralizer set to web defaults.
    JsonSerializerOptions wd = new(JsonSerializerDefaults.Web);
    // ---------------- Item Endpoints ----------------
        // GET /api/items/mine: Get all items owned by the authenticated user (for postings page)
    app.MapGet("/api/items/mine", async (HttpContext ctx, IItemService items, IItemImageService images) =>
        {
            var userId = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();
            var userItems = await items.GetForOwnerAsync(userId);

            // Transform items to include maintenance tasks and format for frontend
            var responseItems = userItems.Select(item => mapResponseObject(item,images)).ToList();

            return Results.Json(responseItems, wd, "application/json", 200);
        }).RequireAuthorization()
            .WithSummary("Get all items owned by the authenticated user")
            .Produces(200)
            .Produces(401);
        // GET /api/items: Get all items available to borrow (from other users)
    app.MapGet("/api/items", async ([FromQuery(Name = "search")] string query, HttpContext ctx, IItemService items, IItemImageService images) =>
        {
	    Console.WriteLine($"Searching for {query}.");
            var userId = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);
            // For now, return empty array since we don't have a way to get items from other users
            // TODO: Implement GetAllAvailableAsync method in ItemService
            var results = await items.GetAllAvailableAsync(userId, query);
	    var responseItems = results.Select(item => mapResponseObject(item,images)).ToList();
            return Results.Json(responseItems, wd, "application/json", 200);
        }).RequireAuthorization()
        .WithSummary("Get all items available to borrow from other users")
	.Produces(200);
        // POST /api/items: Adds a new item for the active user.
        app.MapPost("/api/items", async (ItemCreateRequest item, HttpContext ctx, IUserService users, IItemService items) =>
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
        
        app.MapGet("/api/items/{id}", async (string id, IItemService items, IItemImageService images) => {
            if (string.IsNullOrEmpty(id)) return Results.BadRequest();
            // Try to find the item under {id}.
            Item? i = await items.GetById(id);
            if(i is null){
                return Results.NotFound();
            }
            else{
                ItemGetResponse res = mapResponseObject(i, images);
                return Results.Json(res, wd, "application/json", 200);
            }
            }).Produces(200) // Here is the item!
            .Produces(400) // Bad request.
            .Produces(404); // Item not found.
	app.MapPut("/api/items/{id}", async (string id, ItemUpdateRequest inf, HttpContext ctx, IItemService items) => {
	    if(string.IsNullOrWhiteSpace(id)) return Results.BadRequest(new {message = "Item id field is missing or empty!"});
	    var userId = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);
	    if(string.IsNullOrWhiteSpace(userId)) return Results.Unauthorized();
	    int status = await items.UpdateAsync(id, userId, inf.Name, inf.Description, inf.Properties);
	    if(status == 404) return Results.NotFound(new {message = $"Item {id} not found!"});
	    return Results.Json(new ItemCreateResponse(id), wd, "application/json", status);
        }).RequireAuthorization("ItemOwner")
            .WithSummary("Update the item @ {id}")
            .Produces(201)
            .Produces(400) // Bad request (either the id or info was invalid).
            .Produces(401) // Unauthenticated
            .Produces(403) // Editing an item that isn't yours.
            .Produces(404); // Item not found.
	app.MapDelete("/api/items/{id}", async (string id, HttpContext ctx, IItemService items) => {
	    var userId = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);
	    return Results.StatusCode(await items.DeleteAsync(id, userId));
        }).RequireAuthorization("ItemOwner")
            .WithSummary("Remove the item @ {id}")
            .Produces(201)
            .Produces(400) // Bad request (id was invalid/missing).
            .Produces(401) // Unauthenticated
            .Produces(403) // Editing an item that isn't yours.
            .Produces(404); // Item not found.

        //Example ID: 43f777b61c7e442595b744a59e2399e7
        return app;
    }
}
