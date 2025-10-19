using Hippo_Exchange.Models;
using MongoDB.Driver;
//using Microsoft.Identity.Web;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace Hippo_Exchange.Services;

public interface IItemService
{
    Task<string> CreateAsync(string ownerUserId, string name, string? description, Dictionary<string, string>? properties);
    Task<List<Item>> GetForOwnerAsync(string ownerUserId);
    // Get an Item based on the item id.
    Task<Item?> GetById(string id);
    Task<Item?> GetByIdForOwnerAsync(string id, string ownerUserId);
    // Return status with an integer.
    Task<int> UpdateAsync(string id, string? ownerUserId, string? name, string? description, Dictionary<string, string>? properties);
    Task<int> DeleteAsync(string id, string ownerUserId); 
}

// Authorization Requirement for ownership. Has no attributes
public class OwnershipRequirement : IAuthorizationRequirement {}
/*
public interface IAuthorizationService
{
    /// <summary>
    /// Checks if a user meets a specific set of requirements for the specified resource
    /// </summary>
    /// <param name="user">The user to evaluate the requirements against.</param>
    /// <param name="resource">
    /// An optional resource the policy should be checked with.
    /// If a resource is not required for policy evaluation you may pass null as the value
    /// </param>
    /// <param name="requirements">The requirements to evaluate.</param>
    /// <returns>
    /// A flag indicating whether authorization has succeeded.
    /// This value is <value>true</value> when the user fulfills the policy; 
    /// otherwise <value>false</value>.
    /// </returns>
    /// <remarks>
    /// Resource is an optional parameter and may be null. Please ensure that you check 
    /// it is not null before acting upon it.
    /// </remarks>
    Task<AuthorizationResult> AuthorizeAsync(ClaimsPrincipal user, object resource, 
                                     IEnumerable<IAuthorizationRequirement> requirements);
}
*/
