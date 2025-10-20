using Hippo_Exchange.Models;
using MongoDB.Driver;
namespace Hippo_Exchange.Services;

public sealed class ItemImageService : IItemImageService{
    private readonly IItemService _items;
    private readonly IMongoCollection<ItemImageSet> _images;
    public ItemImageService(IItemService items, IMongoCollection<ItemImageSet> images){
	_items = items;
	_images = images;
    }
    private async Task EnsureIndexesAsync()
    {
        // Create index on ItemId for quick reference.
        var keys = Builders<ItemImageSet>.IndexKeys.Ascending(i => i.Id);
        await _images.Indexes.CreateOneAsync(new CreateIndexModel<ItemImageSet>(keys));
    }
    // Adds an image's url. Called after upload is complete. Return its index or -<status>
    public async Task<int> CreateUrlAsync(string item_id, string image_id){
	Item? item = await _items.GetById(item_id);
	if(item is null) return -404;
	ItemImageSet? imgs = await GetByItemId(item_id);
	int index = (imgs is null) ? 0 : imgs.Images.Count;
	if(imgs is null){
	    string[] tmp_img = {image_id};
	    int[] tmp_ord = {index};
	    imgs = new ItemImageSet{
		Id = item_id,
		Images = new List<string>(tmp_img),
		Order = new List<int>(tmp_ord)
	    };
	    await _images.InsertOneAsync(imgs);
	}
	else{
	// Add to end of images list and order.
	var updateDefs = new List<UpdateDefinition<ItemImageSet>>();
        updateDefs.Add(Builders<ItemImageSet>.Update.Push(i => i.Images, image_id));
        updateDefs.Add(Builders<ItemImageSet>.Update.Push(i => i.Order, index));
	// Get the mongo client instance and start a session.
	var result = await _images.UpdateOneAsync(
            Builders<ItemImageSet>.Filter.Where(i => i.Id == item_id),
            Builders<ItemImageSet>.Update.Combine(updateDefs));
	}
	return index;
    }
    public async Task<int> UpdateUrlAsync(string item_id, int pos, string new_imgid){
	if(string.IsNullOrWhiteSpace(item_id) || string.IsNullOrWhiteSpace(new_imgid)) return 401;
	ItemImageSet? imgs = await GetByItemId(item_id);
	if(imgs is null) return 404;
	if(imgs.Order.Count >= pos) return 401;
	int index = imgs.Order[pos];
	//imgs.Images[index] = new_imgid;
	var result = await _images.UpdateOneAsync(
            Builders<ItemImageSet>.Filter.Where(i => i.Id == item_id),
	    Builders<ItemImageSet>.Update.Set(i => i.Images[index], new_imgid));
	return 201;
    }
    public async Task<int> DeleteUrlAsync(string? item_id, int pos){
	if(string.IsNullOrWhiteSpace(item_id)) return 401;
	ItemImageSet? imgs = await GetByItemId(item_id);
	if(imgs is null) return 404;
	if(imgs.Order.Count >= pos) return 401;
	int index = imgs.Order[pos];
	imgs.Images.RemoveAt(index);
	imgs.Order.RemoveAt(pos);
	imgs.Order.ForEach(p => {if (p >= index) pos--;});
	await _images.ReplaceOneAsync(i => i.Id == item_id, imgs);
	return 201;
    }
    public async Task<string?> GetImageAsync(string item_id, int pos){
	// Item is missing: Return empty string.
	ItemImageSet? imgs = await GetByItemId(item_id);
	if(imgs is null) return "";
	// Pos is invalid: return null.
	if(pos >= imgs.Order.Count) return null;
	return imgs.Images[imgs.Order[pos]];
    }
    public async Task<ItemImageSet?> GetByItemId(string id)
    {
        return await _images.Find(i => i.Id == id)
                          .FirstOrDefaultAsync();
    }
}

    
