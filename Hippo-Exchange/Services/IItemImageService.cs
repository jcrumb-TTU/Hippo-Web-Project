using Hippo_Exchange.Models;
using MongoDB.Driver;
//using Microsoft.Identity.Web;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace Hippo_Exchange.Services;

public interface IItemImageService{
    // Add a new item. Return status.
    Task<int> CreateUrlAsync(string item_id, string img_id);
    // Remove a url @ index. Return status.
    Task<int> DeleteUrlAsync(string item_id, int pos);
    // Get an image set by its item id.
    Task<ItemImageSet?> GetByItemId(string id);
    // Get an image from a set using an item id and index. Return the image id.
    Task<string?> GetImageAsync(string item_id, int pos);
}
