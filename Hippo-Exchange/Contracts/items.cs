namespace Hippo_Exchange.Contracts;

public sealed record ItemCreateRequest(
    string Name,
    string? Description,
    Dictionary<string, string>? Properties
);

public sealed record ItemCreateResponse(
    string id
);

public sealed record MaintenanceTask(
    string description,
    string frequency,
    string materials,
    string tools
);

public sealed record ItemMaintenance(
    string frequency,
    MaintenanceTask[] tasks
);


public sealed record ItemGetResponse(
    string id,
    string title,
    string description,
    string img,
    string[] tags,
    ItemMaintenance maintenance
);



public sealed record ItemUpdateRequest(
    string? Name,
    string? Description,
    Dictionary<string, string>? Properties
);

