namespace Hippo_Exchange.Contracts;

public record LoginResponse(string UserId, string Email, string? Token);
