namespace Hippo_Exchange.Contracts;

public sealed record ItemCreateRequest(
    string Name,
    string? Description,
    Dictionary<string, string>? Properties
);

public sealed record ItemCreateResponse(
    string id
);

public sealed record ItemUpdateRequest(
    string? Name,
    string? Description,
    Dictionary<string, string>? Properties
);
