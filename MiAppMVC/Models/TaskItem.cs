using System;

namespace MiAppMVC.Models;

public class TaskItem
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Priority { get; set; } = "Low"; // Low, Medium, High
    public string Status { get; set; } = "Todo"; // Todo, InProgress, Done
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
