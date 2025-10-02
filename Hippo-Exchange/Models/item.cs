using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Hippo_Exchange.Models;

[BsonIgnoreExtraElements]
public sealed class Item
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public string Id { get; set; } = default!;

    [BsonElement("OwnerUserId")]
    public string OwnerUserId { get; set; } = default!;

    [BsonElement("Name")]
    public string Name { get; set; } = default!;

    [BsonElement("Description")]
    public string? Description { get; set; }

    [BsonElement("Properties")]
    public Dictionary<string, string>? Properties { get; set; }

    [BsonElement("CreatedAtUtc")]
    public DateTime CreatedAtUtc { get; set; }

    [BsonElement("UpdatedAtUtc")]
    public DateTime UpdatedAtUtc { get; set; }
}