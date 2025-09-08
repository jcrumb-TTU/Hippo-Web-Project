//This will NOT be used in the final product.
using System;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Collections;
using System.Collections.Specialized;
using Hippo_Exchange.Models;
namespace SampleDB{
    public abstract class QueryResult{
	virtual public bool? ok{get;}
    }

    public class UserResult : QueryResult{
     public class IssueContainer{
	 public string? fname{get; set;} = null;
	 public string? lname{get; set;} = null;
	 public string? bday{get; set;} = null;
	 public string? email{get; set;} = null;
	 public string? phone{get; set;} = null;
	 public string? password{get; set;} = null;
	 public string? confirm_password{get; set;} = null;
	 public string? terms{get; set;} = null;
	}
     public IssueContainer Issues;
     public override bool? ok{get {return Issues.fname is null && Issues.lname is null && Issues.bday is null && Issues.email is null && Issues.phone is null && Issues.password is null && Issues.confirm_password is null && Issues.terms is null;}}
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
	private static AccountManager _instance = null;
	public static AccountManager Instance => _instance == null ? (_instance = new AccountManager()) : _instance;
	public class UserValidator{
	    private Users user;
	    private UserResult problems;
	    public string? fname{
		get => user.strFirstName;
		set {
		    user.strFirstName = value.Trim();
		    problems.Issues.fname = String.IsNullOrWhiteSpace(value) ?  "First Name field is empty." : null;
		}
	    }
	    public string? lname{
		get => user.strLastName;
		set {
		    user.strLastName = value.Trim();
		    problems.Issues.lname = String.IsNullOrWhiteSpace(value) ? "Last Name field is empty" : null;
		}
	    }
	    public string? bday{
		get => user.strBirthday;
		set {
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
	    public string? email{
		get => user.strEmail;
		set {
		    user.strEmail = value.Trim();
		    if(String.IsNullOrWhiteSpace(value)){
			this.problems.Issues.email = "Email is required.";
		    }
		    this.problems.Issues.email = AccountManager.Instance.checkEmail(user.strEmail) ? "Email is in use" : null;
		}
	    }
	    public string? phone{
		get {return user.strPhoneNumber;}
		set {user.strPhoneNumber = value;}
	    }
	    public string? password{
		
		get => user.strPasswordHash;
		set {
		    try{
			user.SetPassword(value.Trim());
			problems.Issues.password = null;
		    }
		    catch (ArgumentException e){
			problems.Issues.password = e.ToString();
		    }
		}
	    }
	    public string? confirm_password{
		get => (problems.Issues.confirm_password is null) ? "CORRECT" : "INCORRECT";
		set {
		    if(!(problems.Issues.password is null)){
			string oldHash = user.strPasswordHash;
			try{
			    user.SetPassword(value);
			    if(user.strPasswordHash != oldHash){
				throw new ArgumentException("Passwords don't match.");
			    }
			    problems.Issues.confirm_password = null;
			}
			catch (ArgumentException e){
			    problems.Issues.password = e.ToString();
			}
			user.strPasswordHash = oldHash;
		    }
		}
	    }
	    public string? terms{
		get => (problems.Issues.terms is null) ? "ACCEPTED" : "NOT ACCEPTED";
		set => problems.Issues.terms = (value == "on") ? null : "Terms not accepted.";
	    }
	    public UserValidator() : UserValidator("","","","","","","",""){}
	    public UserValidator(string fname, string lname, string bday, string email, string phone, string password, string confirm_password, string terms) {
		this.user = new Users();
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
