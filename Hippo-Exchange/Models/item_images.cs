using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Hippo_Exchange.Models;

[BsonIgnoreExtraElements]
public sealed class ItemImageSet
{
    // The associated Item's id.
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public string Id { get; set; } = default!;

    [BsonElement("Images")]
    public List<string> Images {get; set;} = new List<string>();

    [BsonElement("Order")]
    public List<int> Order {get; set;} = new List<int>();
}
