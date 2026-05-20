using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using MiAppMVC.Models;

namespace MiAppMVC.Controllers;

public class HomeController : Controller
{
    private readonly ILogger<HomeController> _logger;

    public HomeController(ILogger<HomeController> logger)
    {
        _logger = logger;
    }

    public IActionResult Index()
    {
        return View();
    }

    public IActionResult Privacy()
    {
        return View();
    }

    // --- Endpoints de la API para el Tablero Kanban ---

    [HttpGet]
    public IActionResult GetTasks()
    {
        try
        {
            var tasks = TaskRepository.GetAll();
            return Json(tasks);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al obtener tareas.");
            return StatusCode(500, new { message = "Error interno del servidor." });
        }
    }

    [HttpPost]
    public IActionResult CreateTask([FromBody] TaskItem task)
    {
        try
        {
            if (task == null || string.IsNullOrWhiteSpace(task.Title))
            {
                return BadRequest(new { message = "El título es obligatorio y los datos deben ser válidos." });
            }

            var created = TaskRepository.Add(task);
            return Json(created);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al crear tarea.");
            return StatusCode(500, new { message = "Error interno al guardar la tarea." });
        }
    }

    [HttpPost]
    public IActionResult UpdateTaskStatus([FromBody] UpdateStatusModel model)
    {
        try
        {
            if (model == null || string.IsNullOrEmpty(model.Id) || string.IsNullOrEmpty(model.Status))
            {
                return BadRequest(new { message = "Datos de actualización inválidos." });
            }

            bool success = TaskRepository.UpdateStatus(model.Id, model.Status);
            if (!success)
            {
                return NotFound(new { message = $"No se encontró la tarea con ID: {model.Id}" });
            }

            return Json(new { success = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al actualizar estado de tarea.");
            return StatusCode(500, new { message = "Error interno al actualizar estado." });
        }
    }

    [HttpPost]
    public IActionResult DeleteTask([FromBody] DeleteModel model)
    {
        try
        {
            if (model == null || string.IsNullOrEmpty(model.Id))
            {
                return BadRequest(new { message = "ID de tarea inválido." });
            }

            bool success = TaskRepository.Delete(model.Id);
            if (!success)
            {
                return NotFound(new { message = "La tarea no existe o ya fue eliminada." });
            }

            return Json(new { success = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al eliminar tarea.");
            return StatusCode(500, new { message = "Error interno al eliminar la tarea." });
        }
    }

    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public IActionResult Error()
    {
        return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
    }
}

public class UpdateStatusModel
{
    public string Id { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
}

public class DeleteModel
{
    public string Id { get; set; } = string.Empty;
}
