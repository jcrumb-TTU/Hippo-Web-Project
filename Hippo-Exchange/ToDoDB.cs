using Microsoft.EntityFrameworkCore;

class TodoDb : DbContext
{
    public TodoDb(DbContextOptions<TodoDb> options)
        : base(options) { }

    public DbSet<ToDo> Todos => Set<ToDo>();
<<<<<<< HEAD
}
=======
}
>>>>>>> a8620cc548270ff31dab6dffbef47ab8c128bdd1
