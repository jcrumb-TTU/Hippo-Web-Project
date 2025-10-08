﻿// ADDED: Bio + PhotoUrl fields (with BsonElement attributes)

using Isopoh.Cryptography.Argon2;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Hippo_Exchange.Models;

[BsonIgnoreExtraElements]
public class Users
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public string? strUserID { get; set; }

    [BsonElement("FirstName")]
    public string? strFirstName { get; set; }

    [BsonElement("LastName")]
    public string? strLastName { get; set; }

    [BsonElement("Email")]
    public string? strEmail { get; set; }

    [BsonElement("phoneNumber")]
    public string? strPhoneNumber { get; set; }

    [BsonElement("PasswordHash")]
    public string? strPasswordHash { get; set; }

    [BsonElement("Birthday")]
    public string? strBirthday { get; set; }

    // NEW FIELDS (profile data)
    [BsonElement("Bio")]
    public string? Bio { get; set; }

    [BsonElement("PhotoUrl")]
    public string? PhotoUrl { get; set; }

    public void SetPassword(string strPassword)
    {
        if (string.IsNullOrWhiteSpace(strPassword))
            throw new ArgumentException("Password must not be empty.", nameof(strPassword));
        this.strPasswordHash = Argon2.Hash(strPassword);
    }
}