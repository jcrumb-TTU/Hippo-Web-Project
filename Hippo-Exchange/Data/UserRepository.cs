using Hippo_Exchange.Models;
using MongoDB.Driver;

namespace Hippo_Exchange.Data;

public interface IUserRepository
{
    Task<Users?> GetByEmailAsync(string email, CancellationToken ct = default);
    Task InsertAsync(Users user, CancellationToken ct = default);
    Task EnsureIndexesAsync(CancellationToken ct = default);
}

public sealed class UserRepository : IUserRepository
{
    private readonly IMongoCollection<Users> _users;

    public UserRepository(IMongoDatabase db)
    {
        _users = db.GetCollection<Users>("Users");
    }

    public async Task<Users?> GetByEmailAsync(string email, CancellationToken ct = default)
    {
        return await _users.Find(u => u.strEmail == email).FirstOrDefaultAsync(ct);
    }

    public async Task InsertAsync(Users user, CancellationToken ct = default)
    {
        await _users.InsertOneAsync(user, cancellationToken: ct);
    }

    public async Task EnsureIndexesAsync(CancellationToken ct = default)
    {
        var keys = Builders<Users>.IndexKeys.Ascending(u => u.strEmail);
        var opts = new CreateIndexOptions { Unique = true, Name = "uniq_email" };
        await _users.Indexes.CreateOneAsync(new CreateIndexModel<Users>(keys, opts), cancellationToken: ct);
    }
}