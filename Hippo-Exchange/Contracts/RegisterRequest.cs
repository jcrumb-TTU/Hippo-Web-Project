namespace Hippo_Exchange.Contracts;

public record RegisterRequest(
    string FirstName,
    string LastName,
    string Birthday,
    string Email,
    string Phone,
    string Password,
    string ConfirmPassword,
    bool Terms);
