using Hippo_Exchange.Models;

namespace Hippo_Exchange.Services;

public interface IUserService
{
    Task<bool> EmailExistsAsync(string email);
    Task<string> CreateAsync(Users user);
    Task<Users?> GetByEmailAsync(string email);

    // NEW METHODS (add these)
    Task<Users?> GetByIdAsync(string userId);
    Task<bool> UpdateBioAsync(string userId, string? bio);
    Task<bool> UpdatePhotoUrlAsync(string userId, string? photoUrl);
}