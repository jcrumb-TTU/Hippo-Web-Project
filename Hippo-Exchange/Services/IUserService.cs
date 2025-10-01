using Hippo_Exchange.Models;

namespace Hippo_Exchange.Services;

public interface IUserService
{
    Task<bool> EmailExistsAsync(string email);
    Task<string> CreateAsync(Users user);
    Task<Users?> GetByEmailAsync(string email);
}
