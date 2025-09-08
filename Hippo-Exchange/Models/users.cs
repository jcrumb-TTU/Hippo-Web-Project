using Isopoh.Cryptography.Argon2;
using Microsoft.AspNetCore.Identity;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System;

namespace Hippo_Exchange.Models
{
	[BsonIgnoreExtraElements]
    public class Users
	{
		[BsonId]
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
	public string? strBirthday { get; set;}
        public void SetPassword(string strPassword)
        {
            if (string.IsNullOrWhiteSpace(strPassword))
                throw new ArgumentException("Password must not be empty.", nameof(strPassword));
            strPasswordHash = Argon2.Hash(strPassword);
        }
    }
}

