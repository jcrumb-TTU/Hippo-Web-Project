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
    Task<int> DeleteAsync(string id, string? ownerUserId); 
}

