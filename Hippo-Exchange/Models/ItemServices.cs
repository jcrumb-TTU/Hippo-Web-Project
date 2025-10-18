using Hippo_Exchange.Models;
using MongoDB.Driver;

namespace Hippo_Exchange.Services;

public interface IItemService
{
    Task<string> CreateAsync(string ownerUserId, string name, string? description, Dictionary<string, string>? properties);
    Task<List<Item>> GetForOwnerAsync(string ownerUserId);
    // Get an Item based on the item id.
    Task<Item?> GetById(string id);
    Task<Item?> GetByIdForOwnerAsync(string id, string ownerUserId);
    Task<bool> UpdateAsync(string id, string ownerUserId, string? name, string? description, Dictionary<string, string>? properties);
    Task<bool> DeleteAsync(string id, string ownerUserId);
}

public sealed class ItemService : IItemService
{
    private readonly IMongoCollection<Item> _items;

    public ItemService(IMongoCollection<Item> items)
    {
        _items = items;
        EnsureIndexesAsync().GetAwaiter().GetResult();
    }

    private async Task EnsureIndexesAsync()
    {
        // Owner + Id index for quick access
        var keys = Builders<Item>.IndexKeys.Ascending(i => i.OwnerUserId).Ascending(i => i.Id);
        await _items.Indexes.CreateOneAsync(new CreateIndexModel<Item>(keys));
    }

    public async Task<string> CreateAsync(string ownerUserId, string name, string? description, Dictionary<string, string>? properties)
    {
        var now = DateTime.UtcNow;
        var item = new Item
        {
            Id = Guid.NewGuid().ToString("n"),
            OwnerUserId = ownerUserId,
            Name = name,
            Description = description,
            Properties = properties,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };
        await _items.InsertOneAsync(item);
        return item.Id;
    }

    public async Task<List<Item>> GetForOwnerAsync(string ownerUserId)
    {
        return await _items.Find(i => i.OwnerUserId == ownerUserId)
                          .SortByDescending(i => i.UpdatedAtUtc)
                          .ToListAsync();
    }

    public async Task<Item?> GetByIdForOwnerAsync(string id, string ownerUserId)
    {
        return await _items.Find(i => i.Id == id && i.OwnerUserId == ownerUserId)
                          .FirstOrDefaultAsync();
    }
    public async Task<Item?> GetById(string id)
    {
        return await _items.Find(i => i.Id == id)
                          .FirstOrDefaultAsync();
    }
    public async Task<bool> UpdateAsync(string id, string ownerUserId, string? name, string? description, Dictionary<string, string>? properties)
    {
        var updateDefs = new List<UpdateDefinition<Item>>();
        if (!string.IsNullOrWhiteSpace(name)) updateDefs.Add(Builders<Item>.Update.Set(i => i.Name, name));
        if (description is not null) updateDefs.Add(Builders<Item>.Update.Set(i => i.Description, description));
        if (properties is not null) updateDefs.Add(Builders<Item>.Update.Set(i => i.Properties, properties));
        updateDefs.Add(Builders<Item>.Update.Set(i => i.UpdatedAtUtc, DateTime.UtcNow));

        if (updateDefs.Count == 1) // only UpdatedAtUtc
            return false;

        var result = await _items.UpdateOneAsync(
            Builders<Item>.Filter.Where(i => i.Id == id && i.OwnerUserId == ownerUserId),
            Builders<Item>.Update.Combine(updateDefs));

        return result.MatchedCount > 0 && result.ModifiedCount > 0;
    }

    public async Task<bool> DeleteAsync(string id, string ownerUserId)
    {
        var result = await _items.DeleteOneAsync(i => i.Id == id && i.OwnerUserId == ownerUserId);
        return result.DeletedCount > 0;
    }
}
