using Hippo_Exchange.Models;
using MongoDB.Driver;

using System.Threading.Tasks;
using System.Security.Claims;

using Microsoft.AspNetCore.Authorization;
namespace Hippo_Exchange.Services;
// Authorization Requirement for ownership. Has no attributes
public class OwnershipRequirement : IAuthorizationRequirement {}
// All endpoints are /api/items/{id}...
public sealed class OwnershipHandler : AuthorizationHandler<OwnershipRequirement>{
    private readonly IItemService _items;
    public OwnershipHandler(IItemService items){
	_items = items;
    }
    protected override async Task<Task> HandleRequirementAsync(AuthorizationHandlerContext context, OwnershipRequirement r){
	Console.WriteLine("Attempting to validate user identity...");
	System.Collections.Generic.IEnumerable<System.Security.Claims.Claim> claims = context.User.Claims;
	foreach(Claim c in claims){
	    Console.WriteLine($"{c.Type}: {c.Value}");
	}
	var idClaim = context.User.FindFirst(c => c.Type == ClaimTypes.NameIdentifier);
        if (idClaim is null){
	    Console.WriteLine("User ID Claim was NULL!");
      	    context.Fail();
	    return Task.CompletedTask;
	}
	else{
	    Console.WriteLine(idClaim);
	}
       	string? UserID = idClaim.Value;
	if (string.IsNullOrWhiteSpace(UserID)){
	    Console.WriteLine("User ID Claim Value was NULL OR WHITESPACE!");
	    context.Fail();
	    return Task.CompletedTask;
	}
       	// Get the http context, fail if NULL.
	HttpContext? ctx = (context.Resource is HttpContext HttpContext) ? (HttpContext)context.Resource : null;
	if (ctx is null){
	    Console.WriteLine("HttpContext was NULL!");
	    context.Fail();
	    return Task.CompletedTask;
	}
	// Get the item id passed in the request. Will always be /items/{id}/...
	string path = ctx.Request.Path;
	//Length of '/items/': 7. Remove first 7 chars.
	string ItemID = path.Remove(0,7).Split("/")[0];	    
	// Get the item @ ItemID.
	Item? i = await _items.GetById(ItemID);
	// Check if we own the item.
	if (i is null) {
	    context.Fail();
	    // Overwrite the 403 response with a 404 response if not found.
	    ctx.Response.OnStarting(() =>
	    {
		ctx.Response.StatusCode = 404;
		return Task.CompletedTask;
	    });
	}
	else if (i.OwnerUserId == UserID) context.Succeed(r);
	else context.Fail();
	return Task.CompletedTask;
    }
}
