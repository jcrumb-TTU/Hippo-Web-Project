using Microsoft.EntityFrameworkCore;
using System;
using System.Collections;
using System.Collections.Specialized;
using Microsoft.Extensions.Primitives;
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

app.MapGet("/api/myendpoint", () => {
    return Results.Ok(new { message = "Hello from Minimal API!" });
});

app.MapPost("/api/register", (HttpRequest data) => {
	IFormCollection form = data.Form;
	//Console.WriteLine($"Got Post with {form.Count} fields!");
	foreach(KeyValuePair<String,StringValues> item in form){
		Console.WriteLine($"{item.Key}: {item.Value}");
	}
    return Results.Ok(new { message = "Hello from Minimal API!" });
});

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

app.Run();
