using System;
using Microsoft.AspNetCore.Mvc;
using Hippo_Exchange.Models;

namespace Hippo_Exchange.Controllers
{
    [ApiController]
    [Route("register")]
    public class RegisterController : ControllerBase
    {
        public class RegisterForm
        {
            [FromForm(Name = "fname")] public string? FirstName { get; set; }
            [FromForm(Name = "lname")] public string? LastName { get; set; }
            [FromForm(Name = "email")] public string? Email { get; set; }
            [FromForm(Name = "phone")] public string? Phone { get; set; }

            [FromForm(Name = "password")] public string? Password { get; set; }
            [FromForm(Name = "confirm_password")] public string? ConfirmPassword { get; set; }
            [FromForm(Name = "terms")] public bool Terms { get; set; }
        }

        [HttpPost]
        [Consumes("application/x-www-form-urlencoded", "multipart/form-data")]
        public IActionResult Register([FromForm] RegisterForm form)
        {
            // Basic validation (ApiController will auto-400 for model binding failures if you add [Required] on DTO properties)
            if (string.IsNullOrWhiteSpace(form.Password) || string.IsNullOrWhiteSpace(form.ConfirmPassword))
                return BadRequest("Password and confirmation are required.");

            if (form.Password != form.ConfirmPassword)
                return BadRequest("Passwords do not match.");

            if (!form.Terms)
                return BadRequest("You must accept the terms and conditions.");

            // Map to domain model
            var user = new Users
            {
                strFirstName = form.FirstName,
                strLastName = form.LastName,
                strEmail = form.Email,
                strPhoneNumber = form.Phone,
                // strUserID    = generate or assign here if needed
            };

            // Hash/set password using the existing Users method
            try
            {
                user.SetPassword(form.Password);
            }
            catch (ArgumentException ex)
            {
                // Users.SetPassword throws if password is empty; surface a 400
                return BadRequest(ex.Message);
            }

            // TODO: Persist the user (e.g., MongoDB collection insert) and handle duplicates/uniqueness checks
            // e.g., await _usersCollection.InsertOneAsync(user);

            // TODO: Choose the appropriate response:
            // - return Created(...) with a location header
            // - or redirect to a "thanks/login" page if serving HTML
            return Ok(new
            {
                message = "Registration accepted (mock).",
                user = new { user.strFirstName, user.strLastName, user.strEmail }
            });
        }
    }
}
