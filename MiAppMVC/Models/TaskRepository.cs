using System;
using System.Collections.Generic;
using System.Linq;

namespace MiAppMVC.Models;

public static class TaskRepository
{
    private static readonly List<TaskItem> _tasks = new();

    static TaskRepository()
    {
        // Tareas iniciales de ejemplo para poblar el Kanban
        _tasks.Add(new TaskItem
        {
            Title = "Diseñar Interfaz Glassmorphic",
            Description = "Crear el esquema de colores HSL oscuros premium y los efectos de vidrio esmerilado con CSS moderno.",
            Priority = "High",
            Status = "Done"
        });

        _tasks.Add(new TaskItem
        {
            Title = "Implementar Controlador C#",
            Description = "Crear endpoints asíncronos en el controlador HomeController para soportar el guardado y edición vía fetch AJAX.",
            Priority = "Medium",
            Status = "InProgress"
        });

        _tasks.Add(new TaskItem
        {
            Title = "Añadir Drag-and-Drop en Frontend",
            Description = "Utilizar la API nativa de arrastre de HTML5 para permitir arrastrar tarjetas entre las distintas columnas de estado.",
            Priority = "High",
            Status = "Todo"
        });

        _tasks.Add(new TaskItem
        {
            Title = "Pruebas de Rendimiento y UX",
            Description = "Optimizar la tasa de repintado del tablero, validar respuestas móviles y transiciones CSS al mover elementos.",
            Priority = "Low",
            Status = "Todo"
        });
    }

    public static List<TaskItem> GetAll()
    {
        return _tasks.OrderByDescending(t => t.CreatedAt).ToList();
    }

    public static TaskItem? GetById(string id)
    {
        return _tasks.FirstOrDefault(t => t.Id == id);
    }

    public static TaskItem Add(TaskItem task)
    {
        if (string.IsNullOrEmpty(task.Id))
        {
            task.Id = Guid.NewGuid().ToString("N");
        }
        task.CreatedAt = DateTime.UtcNow;
        _tasks.Add(task);
        return task;
    }

    public static TaskItem? Update(string id, TaskItem updatedTask)
    {
        var existing = GetById(id);
        if (existing == null) return null;

        existing.Title = updatedTask.Title;
        existing.Description = updatedTask.Description;
        existing.Priority = updatedTask.Priority;
        existing.Status = updatedTask.Status;

        return existing;
    }

    public static bool UpdateStatus(string id, string status)
    {
        var existing = GetById(id);
        if (existing == null) return false;

        existing.Status = status;
        return true;
    }

    public static bool Delete(string id)
    {
        var existing = GetById(id);
        if (existing == null) return false;

        return _tasks.Remove(existing);
    }
}
