using Microsoft.EntityFrameworkCore;
using System;
using System.Collections;
using System.Collections.Specialized;
using Microsoft.Extensions.Primitives;
using Hippo_Exchange.Models;
using SampleDB;
using System.Text.Json;
using System.Text.Json.Nodes;


//For CORS
var  MyAllowSpecificOrigins = "_myAllowSpecificOrigins";
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDbContext<TodoDb>(opt => opt.UseInMemoryDatabase("TodoList"));
builder.Services.AddDatabaseDeveloperPageExceptionFilter();
//For CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy(name: MyAllowSpecificOrigins,
                      policy  =>
                      {
                          policy.WithOrigins("http://localhost:80");
                      });
});

var app = builder.Build();
app.UseCors(MyAllowSpecificOrigins);
var todoItems = app.MapGroup("/todoitems");

app.MapGet("/api/search/", () => {
    //return Results.Ok(new { message = "Hello from Minimal API!" });
    return Results.Json(new { wrench = { desc = "A wrench used to do things!", properties = {size = "50in"}}; book = { desc = "A cool book!", properties = {size = "12in"}}}, );
});

app.MapPost("/api/register", (HttpRequest formHeader) => {
	IFormCollection form = formHeader.Form;
	AccountManager.UserValidator data = AccountManager.UserValidator.FromForm(form);
        /*
	if(form.TryGetValue("fname", out field)) data.fname = field.ToString(); else Console.WriteLine("First Name field is missing!");
        if(form.TryGetValue("lname", out field)) data.lname = field.ToString(); else Console.WriteLine("Last Name field is missing!");
        if(form.TryGetValue("bday", out field)) data.bday = field.ToString(); else Console.WriteLine("Birthday field is missing!");
        if(form.TryGetValue("email", out field)) data.email = field.ToString(); else Console.WriteLine("Email field is missing!");
	if(form.TryGetValue("phone", out field)) data.phone = field.ToString(); else Console.WriteLine("Phone field is missing!"); 
	if(form.TryGetValue("password", out field)) data.password = field.ToString(); else Console.WriteLine("Password field is missing!");
	if(form.TryGetValue("confirm_password", out field)) data.confirm_password = field.ToString(); else Console.WriteLine("Confirm Password field is missing!");
	if(form.TryGetValue("terms", out field)) data.terms = field.ToString(); else Console.WriteLine("Terms field is missing!");
/*	//Console.WriteLine($"Got Post with {form.Count} fields!");
	foreach(KeyValuePair<String,StringValues> item in form){
		Console.WriteLine($"{item.Key}: {item.Value}");
	}
*/
	if(data.enroll()){
		Console.WriteLine("Account Validated!");
	    return Results.Ok(new { message = "Account creation form accepted!" });
	}
	else{
		
	
		//Console.WriteLine("Account had bad info!");
		//Console.WriteLine(data.Problems);
		//Console.WriteLine(JsonSerializer.Serialize(data));
		return data.Problems;
	}
});

/*
todoItems.MapGet("/", async (TodoDb db) =>
    await db.Todos.ToListAsync());

todoItems.MapGet("/complete", async (TodoDb db) =>
    await db.Todos.Where(t => t.IsComplete).ToListAsync());

todoItems.MapGet("/{id}", async (int id, TodoDb db) =>
    await db.Todos.FindAsync(id)
        is ToDo todo
            ? Results.Ok(todo)
            : Results.NotFound());

todoItems.MapPost("/", async (ToDo todo, TodoDb db) =>
{
    db.Todos.Add(todo);
    await db.SaveChangesAsync();

    return Results.Created($"/todoitems/{todo.Id}", todo);
});

todoItems.MapPut("/{id}", async (int id, ToDo inputTodo, TodoDb db) =>
{
    var todo = await db.Todos.FindAsync(id);

    if (todo is null) return Results.NotFound();

    todo.Name = inputTodo.Name;
    todo.IsComplete = inputTodo.IsComplete;

    await db.SaveChangesAsync();

    return Results.NoContent();
});

todoItems.MapDelete("/{id}", async (int id, TodoDb db) =>
{
    if (await db.Todos.FindAsync(id) is ToDo todo)
    {
        db.Todos.Remove(todo);
        await db.SaveChangesAsync();
        return Results.NoContent();
    }

    return Results.NotFound();
});
*/
app.Run();
