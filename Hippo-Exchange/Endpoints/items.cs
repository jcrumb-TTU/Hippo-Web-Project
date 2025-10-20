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
        // GET /api/items: Get all items for the authenticated user
        app.MapGet("/api/items", async (HttpContext ctx, IItemService items) =>
        {
            var userId = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

            var userItems = await items.GetForOwnerAsync(userId);

            // Transform items to include maintenance tasks and format for frontend
            var responseItems = userItems.Select(item => {
                var maintenanceTasks = new List<object>();

                // Parse maintenance tasks from properties if they exist
                if (item.Properties != null && item.Properties.ContainsKey("maintenanceTasks"))
                {
                    try
                    {
                        var tasksJson = item.Properties["maintenanceTasks"];
                        var tasks = JsonSerializer.Deserialize<List<Dictionary<string, string>>>(tasksJson);
                        if (tasks != null)
                        {
                            maintenanceTasks = tasks.Select(t => new {
                                description = t.ContainsKey("description") ? t["description"] : "",
                                frequency = t.ContainsKey("frequency") ? t["frequency"] : "",
                                materials = t.ContainsKey("materials") ? t["materials"] : "",
                                tools = t.ContainsKey("tools") ? t["tools"] : ""
                            }).Cast<object>().ToList();
                        }
                    }
                    catch { /* ignore parse errors */ }
                }

                return new {
                    id = item.Id,
                    title = item.Name,
                    description = item.Description ?? "",
                    img = "https://placehold.co/600x400?text=" + Uri.EscapeDataString(item.Name),
                    tags = new string[] { },
                    maintenance = new {
                        frequency = maintenanceTasks.Count > 0 ? "Various" : "N/A",
                        tasks = maintenanceTasks
                    }
                };
            }).ToList();

            return Results.Json(responseItems, wd, "application/json", 200);
        }).RequireAuthorization()
            .WithSummary("Get all items for the authenticated user")
            .Produces(200)
            .Produces(401);

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
        
        app.MapGet("/api/items/{id}", async (string id, IItemService items) => {
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
        /*
        app.MapPut("/api/items/{id}", async (string id, ItemUpdateRequest inf, HttpContext ctx, IMongoClient client, IUserService users, IItemService items) => {
            var userId = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);
            int res;
            using (var session = await client.StartSessionAsync()){
            session.StartTransaction();
            try{
                res = await items.UpdateAsync(id, userId, inf.Name, inf.Description, inf.Properties);
            }
            catch {
                await session.AbortTransactionAsync();
                throw;
            }
            await session.CommitTransactionAsync();
            }
            return Results.StatusCode(res);
        }).RequireAuthorization()
            .WithSummary("Update the item @ {id}")
            .Produces(201)
            .Produces(400) // Bad request (either the id or info was invalid).
            .Produces(401) // Unauthenticated
            .Produces(403) // Editing an item that isn't yours.
            .Produces(404); // Item not found.
	*/
        //Example ID: 43f777b61c7e442595b744a59e2399e7
        return app;
    }
}
