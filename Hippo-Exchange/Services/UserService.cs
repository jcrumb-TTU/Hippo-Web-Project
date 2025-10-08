using Hippo_Exchange.Models;
using MongoDB.Driver;

namespace Hippo_Exchange.Services;

public class UserService : IUserService
{
    private readonly IMongoCollection<Users> _users;

    public UserService(IMongoCollection<Users> users)
    {
        _users = users;
        EnsureIndexesAsync().GetAwaiter().GetResult();
    }

    private async Task EnsureIndexesAsync()
    {
        var indexKeys = Builders<Users>.IndexKeys.Ascending(u => u.strEmail);
        var indexModel = new CreateIndexModel<Users>(indexKeys, new CreateIndexOptions { Unique = true });
        await _users.Indexes.CreateOneAsync(indexModel);
    }

    public async Task<bool> EmailExistsAsync(string email)
    {
        var filter = Builders<Users>.Filter.Eq(u => u.strEmail, email);
        return await _users.Find(filter).AnyAsync();
    }

    public async Task<string> CreateAsync(Users user)
    {
        user.strUserID = Guid.NewGuid().ToString("n");
        await _users.InsertOneAsync(user);
        return user.strUserID!;
    }

    public async Task<Users?> GetByEmailAsync(string email)
    {
        var filter = Builders<Users>.Filter.Eq(u => u.strEmail, email);
        return await _users.Find(filter).FirstOrDefaultAsync();
    }

    // NEW: Get by ID
    public async Task<Users?> GetByIdAsync(string userId)
    {
        var filter = Builders<Users>.Filter.Eq(u => u.strUserID, userId);
        return await _users.Find(filter).FirstOrDefaultAsync();
    }

    // NEW: Update Bio
    public async Task<bool> UpdateBioAsync(string userId, string? bio)
    {
        var update = Builders<Users>.Update.Set(u => u.Bio, bio ?? "");
        var result = await _users.UpdateOneAsync(u => u.strUserID == userId, update);
        return result.MatchedCount > 0;
    }

    // NEW: Update Photo URL
    public async Task<bool> UpdatePhotoUrlAsync(string userId, string? photoUrl)
    {
        var update = Builders<Users>.Update.Set(u => u.PhotoUrl, photoUrl ?? "");
        var result = await _users.UpdateOneAsync(u => u.strUserID == userId, update);
        return result.MatchedCount > 0;
    }
}