//This will NOT be used in the final product.
using Isopoh.Cryptography.Argon2;
using Microsoft.AspNetCore.Identity;
using System;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using System.Collections;
using System.Collections.Specialized;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Http;
using Hippo_Exchange.Models;
using Microsoft.Extensions.Primitives;
namespace SampleDB{
    public abstract class QueryResult{
	virtual public bool? ok{get;}
    }
    public class UserResult : QueryResult{
    public struct IssueContainer{
	public IssueContainer() { }
	[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
	public string? fname{get; set;} = null;
	[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
	 public string? lname{get; set;} = null;
	[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
	 public string? bday{get; set;} = null;
	[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
	 public string? email{get; set;} = null;
	[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
	 public string? phone{get; set;} = null;
	[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
	 public string? password{get; set;} = null;
	[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
	 public string? confirm_password{get; set;} = null;
	[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
	 public string? terms{get; set;} = null;
	}
	public IssueContainer Issues;
        public override bool? ok{get {return this.Issues.fname is null && this.Issues.lname is null && this.Issues.bday is null && this.Issues.email is null && this.Issues.phone is null && this.Issues.password is null && this.Issues.confirm_password is null && this.Issues.terms is null;}}
	public UserResult(){this.Issues = new IssueContainer();}
    }
    public class AccountManager{
	/*
	  Account Struct
	  fname: Samuel
	  lname: Fincher
	  bday: 2000-01-01
	  email: smfincher@yahoo.com
	  phone: 1234567890
	  password: password
	  confirm_password: password
	  terms: on
	 */
	private static AccountManager? _instance = null;
	public static AccountManager Instance => _instance == null ? (_instance = new AccountManager()) : _instance;
	public class UserValidator{
	    private Users user;
	    private UserResult problems;
	    public static AccountManager.UserValidator FromForm(IFormCollection form){
		AccountManager.UserValidator data = new AccountManager.UserValidator();
		StringValues field;
		string dummy;
	        dummy = (form.TryGetValue("fname", out field)) ?  data.fname = field.ToString() :  data.problems.Issues.fname = "First Name field is missing!";
		Console.WriteLine($"fname: {dummy}");
	        dummy = (form.TryGetValue("lname", out field)) ?  data.lname = field.ToString() :  data.problems.Issues.lname = "Last Name field is missing!";
		Console.WriteLine($"lname: {dummy}");
        	dummy = (form.TryGetValue("bday", out field)) ?  data.bday = field.ToString() :  data.problems.Issues.bday = "Birthday field is missing!";
		Console.WriteLine($"bday: {dummy}");
	        dummy = (form.TryGetValue("email", out field)) ?  data.email = field.ToString() : data.problems.Issues.email = "Email field is missing!";
		Console.WriteLine($"email: {dummy}");
		dummy = (form.TryGetValue("phone", out field)) ?  data.phone = field.ToString() :  data.problems.Issues.phone = "Phone field is missing!"; 
		Console.WriteLine($"phone: {dummy}");
		dummy = (form.TryGetValue("password", out field)) ?  data.password = field.ToString() :  data.problems.Issues.password = "Password field is missing!";
		Console.WriteLine($"password (len={dummy.Length}): {dummy}");
		dummy = (form.TryGetValue("confirm_password", out field)) ?  data.confirm_password = field.ToString() : data.problems.Issues.confirm_password = "Confirm Password field is missing!";
		Console.WriteLine($"confirm_password (len={dummy.Length}): {dummy}");
		dummy = (form.TryGetValue("terms", out field)) ?  data.terms = field.ToString() : data.problems.Issues.terms =  "Terms field is missing!";
		Console.WriteLine($"terms: {dummy}");
		return data;	
	    }
	    [JsonIgnore]
	    public IResult Problems{
		get => Results.Json(this.problems.Issues, new JsonSerializerOptions(JsonSerializerDefaults.Web), "application/json", 400);
	    }
	    public string fname{
		get => user.strFirstName;
		set {
		    user.strFirstName = value.Trim();
		    problems.Issues.fname = String.IsNullOrWhiteSpace(value) ?  "First Name field is empty." : null;
		}
	    }
	    public string lname{
		get => user.strLastName;
		set {
		    user.strLastName = (value is null) ? "" : value.Trim();
		    problems.Issues.lname = String.IsNullOrWhiteSpace(value) ? "Last Name field is empty" : null;
		}
	    }
	    public string bday{
		get => user.strBirthday;
		set {
		    if (value is null){
			problems.Issues.bday = "Field is missing.";
			return;
		    }
		    user.strBirthday = value.Trim();
		    DateTime bday;
		    if(Regex.IsMatch(value, @"\d\d\d\d-\d\d-\d\d")){
			if(DateTime.TryParse(value, out bday)){
			    problems.Issues.bday = (bday > DateTime.Now) ? "Date is in the future" : null;
			}
			else{
			    problems.Issues.bday = "Date could not be parsed.";
			}
		    }
		    else{
			problems.Issues.bday = "Date was not in the correct format";
		    }
		}
	    }
	    public string email{
		get => user.strEmail;
		set {
		    user.strEmail = value.Trim();
		    if(String.IsNullOrWhiteSpace(value)){
			this.problems.Issues.email = "Email is required.";
		    }
		    this.problems.Issues.email = AccountManager.Instance.checkEmail(user.strEmail) ? "Email is in use" : null;
		}
	    }
	    public string phone{
		get {return user.strPhoneNumber;}
		set {user.strPhoneNumber = value;}
	    }
	    public string password{
		
		get => user.strPasswordHash;
		set {
		    try{
			user.SetPassword(value.Trim());
			problems.Issues.password = null;
		    }
		    catch (ArgumentException e){
			problems.Issues.password = e.Message;
		    }
		}
	    }
	    public string confirm_password{
		get => (problems.Issues.confirm_password is null) ? "CORRECT" : "INCORRECT";
		set {
		    if(problems.Issues.password is null){
			Console.WriteLine("No issue with initial password detected.");
			try{
			    if(Argon2.Verify(user.strPasswordHash, value.Trim()) == false){
				problems.Issues.confirm_password = "Passwords don't match.";
			    }
			    else{
				problems.Issues.confirm_password = null;
			    }
			}
			catch (ArgumentException e){
			//Console.WriteLine("Caught an exception!");
			    problems.Issues.confirm_password = e.Message;
			}
		    }
		}
	    }
	    public string terms{
		get => (problems.Issues.terms is null) ? "ACCEPTED" : "NOT ACCEPTED";
		set => problems.Issues.terms = (value == "on") ? null : "Terms not accepted.";
	    }
	    public UserValidator() : this("","","","","","","",""){}
	    public UserValidator(string fname, string lname, string bday, string email, string phone, string password, string confirm_password, string terms) {
		this.user = new Users();
		this.problems = new UserResult();
		this.fname = fname;
		this.lname = lname;
		this.bday = bday;
		this.email = email;
		this.phone = phone;
		this.password = password;
		this.confirm_password = confirm_password;
		this.terms = terms;
	    }
	    public bool enroll(){
		if (problems.ok == true){
		    this.user.strUserID = AccountManager.Instance.nextId.ToString();
		    AccountManager.Instance.AddUser(this.user);
			return true;
		}
		return false;
	    }
	}
	private List<Users> Users;
	private AccountManager(){
		this.Users = new List<Users>();
	}
	public void AddUser(Users user){
	    // Ensure all properties are in the form.
	    this.Users.Add(user);
	    
	}
	public bool checkEmail(string email){
	    foreach(Users u in this.Users){
		if (email == u.strEmail){
		    return true;
		}
	    }
		return false;
	}
	public int? nextId{
	    get => Users.Count;
	}
    }
    public class Items{

    }
};
