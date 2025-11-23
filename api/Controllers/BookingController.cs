using Microsoft.AspNetCore.Mvc;
using MySql.Data.MySqlClient;
using System.Data;

namespace api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BookingController : ControllerBase
{
    private readonly MySqlConnection _connection;

    public BookingController(MySqlConnection connection)
    {
        _connection = connection;
    }

    // GET: api/Booking
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Booking>>> GetAllBookings()
    {
        try
        {
            await _connection.OpenAsync();
            var bookings = new List<Booking>();
            var command = new MySqlCommand("SELECT bookingid, classid, petid, empid, bookingdate, status, paymentstatus, amountpaid FROM Booking", _connection);
            
            using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                bookings.Add(new Booking
                {
                    BookingId = reader.GetInt32("bookingid"),
                    ClassId = reader.GetInt32("classid"),
                    PetId = reader.GetInt32("petid"),
                    EmployeeId = reader.GetInt32("empid"),
                    BookingDate = reader.GetDateTime("bookingdate"),
                    Status = reader.GetString("status"),
                    PaymentStatus = reader.GetString("paymentstatus"),
                    AmountPaid = reader.GetDecimal("amountpaid")
                });
            }
            
            return Ok(bookings);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error retrieving bookings", error = ex.Message });
        }
        finally
        {
            if (_connection.State == ConnectionState.Open)
                await _connection.CloseAsync();
        }
    }

    // GET: api/Booking/5
    [HttpGet("{id}")]
    public async Task<ActionResult<Booking>> GetBooking(int id)
    {
        try
        {
            await _connection.OpenAsync();
            var command = new MySqlCommand("SELECT bookingid, classid, petid, empid, bookingdate, status, paymentstatus, amountpaid FROM Booking WHERE bookingid = @id", _connection);
            command.Parameters.AddWithValue("@id", id);
            
            using var reader = await command.ExecuteReaderAsync();
            if (await reader.ReadAsync())
            {
                var booking = new Booking
                {
                    BookingId = reader.GetInt32("bookingid"),
                    ClassId = reader.GetInt32("classid"),
                    PetId = reader.GetInt32("petid"),
                    EmployeeId = reader.GetInt32("empid"),
                    BookingDate = reader.GetDateTime("bookingdate"),
                    Status = reader.GetString("status"),
                    PaymentStatus = reader.GetString("paymentstatus"),
                    AmountPaid = reader.GetDecimal("amountpaid")
                };
                return Ok(booking);
            }
            
            return NotFound(new { message = $"Booking with ID {id} not found" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error retrieving booking", error = ex.Message });
        }
        finally
        {
            if (_connection.State == ConnectionState.Open)
                await _connection.CloseAsync();
        }
    }

    // POST: api/Booking
    [HttpPost]
    public async Task<ActionResult<Booking>> CreateBooking([FromBody] Booking booking)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            await _connection.OpenAsync();
            var command = new MySqlCommand(
                "INSERT INTO Booking (classid, petid, empid, bookingdate, status, paymentstatus, amountpaid) VALUES (@classid, @petid, @empid, @bookingdate, @status, @paymentstatus, @amountpaid); SELECT LAST_INSERT_ID();",
                _connection);
            
            command.Parameters.AddWithValue("@classid", booking.ClassId);
            command.Parameters.AddWithValue("@petid", booking.PetId);
            command.Parameters.AddWithValue("@empid", booking.EmployeeId);
            command.Parameters.AddWithValue("@bookingdate", booking.BookingDate);
            command.Parameters.AddWithValue("@status", booking.Status);
            command.Parameters.AddWithValue("@paymentstatus", booking.PaymentStatus);
            command.Parameters.AddWithValue("@amountpaid", booking.AmountPaid);
            
            var newId = Convert.ToInt32(await command.ExecuteScalarAsync());
            booking.BookingId = newId;
            
            return CreatedAtAction(nameof(GetBooking), new { id = newId }, booking);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error creating booking", error = ex.Message });
        }
        finally
        {
            if (_connection.State == ConnectionState.Open)
                await _connection.CloseAsync();
        }
    }

    // PUT: api/Booking/5
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateBooking(int id, [FromBody] Booking booking)
    {
        if (id != booking.BookingId)
        {
            return BadRequest(new { message = "ID mismatch" });
        }

        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            await _connection.OpenAsync();
            var command = new MySqlCommand(
                "UPDATE Booking SET classid = @classid, petid = @petid, empid = @empid, bookingdate = @bookingdate, status = @status, paymentstatus = @paymentstatus, amountpaid = @amountpaid WHERE bookingid = @bookingid",
                _connection);
            
            command.Parameters.AddWithValue("@bookingid", id);
            command.Parameters.AddWithValue("@classid", booking.ClassId);
            command.Parameters.AddWithValue("@petid", booking.PetId);
            command.Parameters.AddWithValue("@empid", booking.EmployeeId);
            command.Parameters.AddWithValue("@bookingdate", booking.BookingDate);
            command.Parameters.AddWithValue("@status", booking.Status);
            command.Parameters.AddWithValue("@paymentstatus", booking.PaymentStatus);
            command.Parameters.AddWithValue("@amountpaid", booking.AmountPaid);
            
            var rowsAffected = await command.ExecuteNonQueryAsync();
            
            if (rowsAffected == 0)
            {
                return NotFound(new { message = $"Booking with ID {id} not found" });
            }
            
            return NoContent();
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error updating booking", error = ex.Message });
        }
        finally
        {
            if (_connection.State == ConnectionState.Open)
                await _connection.CloseAsync();
        }
    }

    // DELETE: api/Booking/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteBooking(int id)
    {
        try
        {
            await _connection.OpenAsync();
            var command = new MySqlCommand("DELETE FROM Booking WHERE bookingid = @id", _connection);
            command.Parameters.AddWithValue("@id", id);
            
            var rowsAffected = await command.ExecuteNonQueryAsync();
            
            if (rowsAffected == 0)
            {
                return NotFound(new { message = $"Booking with ID {id} not found" });
            }
            
            return NoContent();
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error deleting booking", error = ex.Message });
        }
        finally
        {
            if (_connection.State == ConnectionState.Open)
                await _connection.CloseAsync();
        }
    }
}

public class Booking
{
    public int BookingId { get; set; }
    public int ClassId { get; set; }
    public int PetId { get; set; }
    public int EmployeeId { get; set; }
    public DateTime BookingDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public string PaymentStatus { get; set; } = string.Empty;
    public decimal AmountPaid { get; set; }
}

