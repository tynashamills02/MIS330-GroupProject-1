// API Configuration
const API_BASE_URL = 'http://localhost:5172/api';

// Global state
let currentDeleteCallback = null;
let currentDeleteId = null;
let currentDeleteEntity = null;
let currentUser = null; // Store logged in user info

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initializeNavigation();
  showSection('home');
  loadHomeStats();
  setupDeleteModal();
  setupCreateProfileForm();
  setupLoginForm();
  
  // Check if user is logged in from sessionStorage
  const savedUser = sessionStorage.getItem('currentUser');
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    updateLoginLogoutButtons();
    if (currentUser.userType === 'customer') {
      showSection('customer-dashboard');
    } else if (currentUser.userType === 'trainer') {
      showSection('trainer-dashboard');
    } else if (currentUser.userType === 'admin' && checkAdminAccess()) {
      showSection('admin');
    }
  } else {
    updateLoginLogoutButtons();
  }
  
  // Initial visibility update
  updateCreateProfileVisibility();
});

// Navigation Setup
function initializeNavigation() {
  const navLinks = document.querySelectorAll('.nav-link[data-section], .dropdown-item[data-section]');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = link.getAttribute('data-section');
      showSection(section);
      
      // Update active nav link (only for main nav, not dropdown)
      if (link.classList.contains('nav-link')) {
        document.querySelectorAll('.nav-link[data-section]').forEach(nl => nl.classList.remove('active'));
        link.classList.add('active');
      }
    });
  });
}

// Show specific section
function showSection(sectionName) {
  // Hide all sections
  document.querySelectorAll('.content-section').forEach(section => {
    section.style.display = 'none';
  });
  
  // Show selected section
  let targetSection = document.getElementById(`${sectionName}-section`);
  // Handle admin section (no -section suffix)
  if (!targetSection && sectionName === 'admin') {
    targetSection = document.getElementById('admin-section');
  }
  if (targetSection) {
    targetSection.style.display = 'block';
    
    // Load data for the section
    switch(sectionName) {
      case 'home':
        loadHomeStats();
        break;
      case 'customers':
        loadCustomers();
        break;
      case 'pets':
        loadPets();
        break;
      case 'trainers':
        loadTrainers();
        break;
      case 'employees':
        loadEmployees();
        break;
      case 'classes':
        // Trainers should only see their own classes; everyone else sees all classes
        if (currentUser && currentUser.userType === 'trainer') {
          loadTrainerClasses();
        } else {
          loadClasses();
        }
        break;
      case 'bookings':
        // Trainers should only see bookings for their own classes; everyone else sees all bookings
        if (currentUser && currentUser.userType === 'trainer') {
          loadTrainerBookings();
        } else {
          loadBookings();
        }
        break;
      case 'customer-dashboard':
        updateCustomerDashboard();
        break;
      case 'customer-classes':
        loadCustomerClasses();
        break;
      case 'customer-bookings':
        loadCustomerBookings();
        break;
      case 'customer-pets':
        loadCustomerPetsForView();
        break;
      case 'trainer-dashboard':
        updateTrainerDashboard();
        break;
      case 'login':
        // Update create profile button visibility when login section is shown
        updateCreateProfileVisibility();
        break;
      case 'admin':
        // Check admin access before showing admin section
        if (!checkAdminAccess()) {
          showSection('login');
          showAlert('Admin access required. Please log in as an admin.', 'warning');
          return;
        }
        loadAdminData();
        break;
    }
  }
  
  // Update active nav link
  const navLink = document.querySelector(`.nav-link[data-section="${sectionName}"]`);
  if (navLink) {
    document.querySelectorAll('.nav-link[data-section]').forEach(nl => nl.classList.remove('active'));
    navLink.classList.add('active');
  }
}

// Alert helper
function showAlert(message, type = 'success') {
  const alertContainer = document.getElementById('alertContainer');
  const alertId = `alert-${Date.now()}`;
  const alertHtml = `
    <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
  `;
  alertContainer.innerHTML = alertHtml;
  
  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    const alert = document.getElementById(alertId);
    if (alert) {
      const bsAlert = new bootstrap.Alert(alert);
      bsAlert.close();
    }
  }, 5000);
}

// Generic API call function
async function apiCall(endpoint, method = 'GET', data = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    if (data && (method === 'POST' || method === 'PUT')) {
      console.log(`Sending to API [${method} ${endpoint}]:`, JSON.stringify(data));
      options.body = JSON.stringify(data);
    }
    
    const response = await fetch(`${API_BASE_URL}/${endpoint}`, options);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ 
        message: `HTTP error! status: ${response.status}` 
      }));
      // Include the error details if available
      const errorMessage = errorData.error 
        ? `${errorData.message}: ${errorData.error}` 
        : (errorData.message || `HTTP error! status: ${response.status}`);
      throw new Error(errorMessage);
    }
    
    // Handle 204 No Content
    if (response.status === 204) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    // Handle network errors
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      throw new Error('Cannot connect to API. Make sure the API server is running on http://localhost:5172');
    }
    console.error('API Error:', error);
    throw error;
  }
}

// ==================== CUSTOMERS ====================
async function loadCustomers() {
  try {
    const customers = await apiCall('Customer');
    const tbody = document.getElementById('customers-table-body');
    
    if (customers.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center">No customers found</td></tr>';
      return;
    }
    
    tbody.innerHTML = customers.map(customer => `
      <tr>
        <td>${customer.customerId}</td>
        <td>${customer.firstName}</td>
        <td>${customer.lastName}</td>
        <td>${customer.phoneNum}</td>
        <td>${customer.address || '-'}</td>
        <td>
          <button class="btn btn-sm btn-primary" onclick="editCustomer(${customer.customerId})">
            <i class="bi bi-pencil"></i> Edit
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteCustomer(${customer.customerId})">
            <i class="bi bi-trash"></i> Delete
          </button>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    const errorMsg = error.message || 'Unknown error';
    showAlert(`Error loading customers: ${errorMsg}`, 'danger');
    document.getElementById('customers-table-body').innerHTML = 
      `<tr><td colspan="6" class="text-center text-danger">Error: ${errorMsg}</td></tr>`;
  }
}

function openCustomerModal(customer = null) {
  const modal = new bootstrap.Modal(document.getElementById('customerModal'));
  const form = document.getElementById('customerForm');
  form.reset();
  document.getElementById('customerId').value = '';
  
  if (customer) {
    document.getElementById('customerModalTitle').textContent = 'Edit Customer';
    document.getElementById('customerId').value = customer.customerId;
    document.getElementById('customerFirstName').value = customer.firstName;
    document.getElementById('customerLastName').value = customer.lastName;
    document.getElementById('customerPhone').value = customer.phoneNum;
    document.getElementById('customerAddress').value = customer.address || '';
  } else {
    document.getElementById('customerModalTitle').textContent = 'Add Customer';
  }
  
  modal.show();
}

async function editCustomer(id) {
  try {
    const customer = await apiCall(`Customer/${id}`);
    openCustomerModal(customer);
  } catch (error) {
    showAlert(`Error loading customer: ${error.message}`, 'danger');
  }
}

async function saveCustomer() {
  const form = document.getElementById('customerForm');
  if (!form) {
    showAlert('Form not found', 'danger');
    return;
  }
  
  // HTML5 validation handles required fields
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  
  // Safely get form elements
  const customerIdEl = document.getElementById('customerId');
  const firstNameEl = document.getElementById('customerFirstName');
  const lastNameEl = document.getElementById('customerLastName');
  const phoneEl = document.getElementById('customerPhone');
  const addressEl = document.getElementById('customerAddress');
  
  // Check if required elements exist
  if (!firstNameEl || !lastNameEl || !phoneEl) {
    showAlert('Form fields not found', 'danger');
    return;
  }
  
  // Safely get and trim values (handle undefined/null)
  const customerId = customerIdEl ? (parseInt(customerIdEl.value) || 0) : 0;
  const firstName = (firstNameEl.value || '').trim();
  const lastName = (lastNameEl.value || '').trim();
  const phoneNum = (phoneEl.value || '').trim();
  const address = addressEl ? (addressEl.value || '').trim() : '';
  
  // Build customer object with trimmed values
  // Backend will validate required fields
  const customer = {
    customerId: customerId,
    firstName: firstName,
    lastName: lastName,
    phoneNum: phoneNum,
    address: address || null
  };
  
  try {
    if (customer.customerId > 0) {
      await apiCall(`Customer/${customer.customerId}`, 'PUT', customer);
      showAlert('Customer updated successfully!');
    } else {
      await apiCall('Customer', 'POST', customer);
      showAlert('Customer created successfully!');
    }
    
    bootstrap.Modal.getInstance(document.getElementById('customerModal')).hide();
    loadCustomers();
  } catch (error) {
    showAlert(`Error saving customer: ${error.message}`, 'danger');
  }
}

function deleteCustomer(id) {
  currentDeleteId = id;
  currentDeleteEntity = 'Customer';
  currentDeleteCallback = async () => {
    try {
      await apiCall(`Customer/${id}`, 'DELETE');
      showAlert('Customer deleted successfully!');
      loadCustomers();
    } catch (error) {
      showAlert(`Error deleting customer: ${error.message}`, 'danger');
    }
  };
  
  const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
  modal.show();
}

// ==================== PETS ====================
async function loadPets() {
  try {
    const pets = await apiCall('Pet');
    const tbody = document.getElementById('pets-table-body');
    
    if (pets.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center">No pets found</td></tr>';
      return;
    }
    
    tbody.innerHTML = pets.map(pet => `
      <tr>
        <td>${pet.petId}</td>
        <td>${pet.customerId}</td>
        <td>${pet.name}</td>
        <td>${pet.species}</td>
        <td>${pet.breed || '-'}</td>
        <td>${new Date(pet.birthDate).toLocaleDateString()}</td>
        <td>
          <button class="btn btn-sm btn-primary" onclick="editPet(${pet.petId})">
            <i class="bi bi-pencil"></i> Edit
          </button>
          <button class="btn btn-sm btn-danger" onclick="deletePet(${pet.petId})">
            <i class="bi bi-trash"></i> Delete
          </button>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    showAlert(`Error loading pets: ${error.message}`, 'danger');
    document.getElementById('pets-table-body').innerHTML = 
      '<tr><td colspan="7" class="text-center text-danger">Error loading data</td></tr>';
  }
}

function openPetModal(pet = null) {
  const modal = new bootstrap.Modal(document.getElementById('petModal'));
  const form = document.getElementById('petForm');
  form.reset();
  document.getElementById('petId').value = '';
  
  if (pet) {
    document.getElementById('petModalTitle').textContent = 'Edit Pet';
    document.getElementById('petId').value = pet.petId;
    document.getElementById('petCustomerId').value = pet.customerId;
    document.getElementById('petName').value = pet.name;
    document.getElementById('petSpecies').value = pet.species;
    document.getElementById('petBreed').value = pet.breed || '';
    document.getElementById('petBirthDate').value = pet.birthDate.split('T')[0];
    document.getElementById('petNotes').value = pet.notes || '';
  } else {
    document.getElementById('petModalTitle').textContent = 'Add Pet';
  }
  
  modal.show();
}

async function editPet(id) {
  try {
    const pet = await apiCall(`Pet/${id}`);
    openPetModal(pet);
  } catch (error) {
    showAlert(`Error loading pet: ${error.message}`, 'danger');
  }
}

async function savePet() {
  const form = document.getElementById('petForm');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  
  const pet = {
    petId: parseInt(document.getElementById('petId').value) || 0,
    customerId: parseInt(document.getElementById('petCustomerId').value),
    name: document.getElementById('petName').value,
    species: document.getElementById('petSpecies').value,
    breed: document.getElementById('petBreed').value || null,
    birthDate: document.getElementById('petBirthDate').value,
    notes: document.getElementById('petNotes').value || null
  };
  
  try {
    if (pet.petId > 0) {
      // If editing and user is a customer, verify ownership
      if (currentUser && currentUser.userType === 'customer') {
        await loadCustomerPets();
        const existingPet = customerPets.find(p => p.petId === pet.petId);
        if (!existingPet) {
          showAlert('You do not have permission to edit this pet.', 'danger');
          return;
        }
      }
      
      await apiCall(`Pet/${pet.petId}`, 'PUT', pet);
      showAlert('Pet updated successfully!');
    } else {
      await apiCall('Pet', 'POST', pet);
      showAlert('Pet created successfully!');
    }
    
    bootstrap.Modal.getInstance(document.getElementById('petModal')).hide();
    
    // Check if we're on customer pets page and reload that view
    const customerPetsSection = document.getElementById('customer-pets-section');
    if (customerPetsSection && customerPetsSection.style.display !== 'none') {
      await loadCustomerPetsForView();
      await loadCustomerPets(); // Reload customer pets array
    } else {
      loadPets(); // Reload admin pets view
    }
  } catch (error) {
    showAlert(`Error saving pet: ${error.message}`, 'danger');
  }
}

function deletePet(id) {
  currentDeleteId = id;
  currentDeleteEntity = 'Pet';
  currentDeleteCallback = async () => {
    try {
      await apiCall(`Pet/${id}`, 'DELETE');
      showAlert('Pet deleted successfully!');
      
      // Check if we're on customer pets page and reload that view
      const customerPetsSection = document.getElementById('customer-pets-section');
      if (customerPetsSection && customerPetsSection.style.display !== 'none') {
        await loadCustomerPetsForView();
        await loadCustomerPets(); // Reload customer pets array
      } else {
        loadPets(); // Reload admin pets view
      }
    } catch (error) {
      showAlert(`Error deleting pet: ${error.message}`, 'danger');
    }
  };
  
  const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
  modal.show();
}

// ==================== TRAINERS ====================
async function loadTrainers() {
  try {
    const trainers = await apiCall('Trainer');
    const tbody = document.getElementById('trainers-table-body');
    
    if (trainers.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center">No trainers found</td></tr>';
      return;
    }
    
    tbody.innerHTML = trainers.map(trainer => `
      <tr>
        <td>${trainer.trainerId}</td>
        <td>${trainer.firstName}</td>
        <td>${trainer.lastName}</td>
        <td>${trainer.phoneNum}</td>
        <td>${trainer.speciality || '-'}</td>
        <td>
          <button class="btn btn-sm btn-primary" onclick="editTrainer(${trainer.trainerId})">
            <i class="bi bi-pencil"></i> Edit
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteTrainer(${trainer.trainerId})">
            <i class="bi bi-trash"></i> Delete
          </button>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    showAlert(`Error loading trainers: ${error.message}`, 'danger');
    document.getElementById('trainers-table-body').innerHTML = 
      '<tr><td colspan="6" class="text-center text-danger">Error loading data</td></tr>';
  }
}

function openTrainerModal(trainer = null) {
  const modal = new bootstrap.Modal(document.getElementById('trainerModal'));
  const form = document.getElementById('trainerForm');
  form.reset();
  document.getElementById('trainerId').value = '';
  
  if (trainer) {
    document.getElementById('trainerModalTitle').textContent = 'Edit Trainer';
    document.getElementById('trainerId').value = trainer.trainerId;
    document.getElementById('trainerFirstName').value = trainer.firstName;
    document.getElementById('trainerLastName').value = trainer.lastName;
    document.getElementById('trainerPhone').value = trainer.phoneNum;
    document.getElementById('trainerSpeciality').value = trainer.speciality || '';
  } else {
    document.getElementById('trainerModalTitle').textContent = 'Add Trainer';
  }
  
  modal.show();
}

async function editTrainer(id) {
  try {
    const trainer = await apiCall(`Trainer/${id}`);
    openTrainerModal(trainer);
  } catch (error) {
    showAlert(`Error loading trainer: ${error.message}`, 'danger');
  }
}

async function saveTrainer() {
  const form = document.getElementById('trainerForm');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  
  const trainer = {
    trainerId: parseInt(document.getElementById('trainerId').value) || 0,
    firstName: document.getElementById('trainerFirstName').value,
    lastName: document.getElementById('trainerLastName').value,
    phoneNum: document.getElementById('trainerPhone').value,
    speciality: document.getElementById('trainerSpeciality').value || null
  };
  
  try {
    if (trainer.trainerId > 0) {
      await apiCall(`Trainer/${trainer.trainerId}`, 'PUT', trainer);
      showAlert('Trainer updated successfully!');
    } else {
      await apiCall('Trainer', 'POST', trainer);
      showAlert('Trainer created successfully!');
    }
    
    bootstrap.Modal.getInstance(document.getElementById('trainerModal')).hide();
    loadTrainers();
  } catch (error) {
    showAlert(`Error saving trainer: ${error.message}`, 'danger');
  }
}

function deleteTrainer(id) {
  currentDeleteId = id;
  currentDeleteEntity = 'Trainer';
  currentDeleteCallback = async () => {
    try {
      await apiCall(`Trainer/${id}`, 'DELETE');
      showAlert('Trainer deleted successfully!');
      loadTrainers();
    } catch (error) {
      showAlert(`Error deleting trainer: ${error.message}`, 'danger');
    }
  };
  
  const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
  modal.show();
}

// ==================== EMPLOYEES ====================
async function loadEmployees() {
  try {
    const employees = await apiCall('Employee');
    const tbody = document.getElementById('employees-table-body');
    
    if (employees.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center">No employees found</td></tr>';
      return;
    }
    
    tbody.innerHTML = employees.map(employee => `
      <tr>
        <td>${employee.employeeId}</td>
        <td>${employee.firstName}</td>
        <td>${employee.lastName}</td>
        <td>${employee.email || '-'}</td>
        <td>${employee.phone || '-'}</td>
        <td>${employee.position || '-'}</td>
        <td>${employee.hireDate ? new Date(employee.hireDate).toLocaleDateString() : '-'}</td>
        <td>
          <button class="btn btn-sm btn-primary" onclick="editEmployee(${employee.employeeId})">
            <i class="bi bi-pencil"></i> Edit
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteEmployee(${employee.employeeId})">
            <i class="bi bi-trash"></i> Delete
          </button>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    showAlert(`Error loading employees: ${error.message}`, 'danger');
    document.getElementById('employees-table-body').innerHTML = 
      '<tr><td colspan="8" class="text-center text-danger">Error loading data</td></tr>';
  }
}

function openEmployeeModal(employee = null) {
  const modal = new bootstrap.Modal(document.getElementById('employeeModal'));
  const form = document.getElementById('employeeForm');
  form.reset();
  document.getElementById('employeeId').value = '';
  
  if (employee) {
    document.getElementById('employeeModalTitle').textContent = 'Edit Employee';
    document.getElementById('employeeId').value = employee.employeeId;
    document.getElementById('employeeFirstName').value = employee.firstName;
    document.getElementById('employeeLastName').value = employee.lastName;
    document.getElementById('employeeEmail').value = employee.email || '';
    document.getElementById('employeePhone').value = employee.phone || '';
    document.getElementById('employeePosition').value = employee.position || '';
    document.getElementById('employeeHireDate').value = employee.hireDate ? employee.hireDate.split('T')[0] : '';
  } else {
    document.getElementById('employeeModalTitle').textContent = 'Add Employee';
  }
  
  modal.show();
}

async function editEmployee(id) {
  try {
    const employee = await apiCall(`Employee/${id}`);
    openEmployeeModal(employee);
  } catch (error) {
    showAlert(`Error loading employee: ${error.message}`, 'danger');
  }
}

async function saveEmployee() {
  const form = document.getElementById('employeeForm');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  
  const employee = {
    employeeId: parseInt(document.getElementById('employeeId').value) || 0,
    firstName: document.getElementById('employeeFirstName').value,
    lastName: document.getElementById('employeeLastName').value,
    email: document.getElementById('employeeEmail').value || null,
    phone: document.getElementById('employeePhone').value || null,
    position: document.getElementById('employeePosition').value || null,
    hireDate: document.getElementById('employeeHireDate').value || null
  };
  
  try {
    if (employee.employeeId > 0) {
      await apiCall(`Employee/${employee.employeeId}`, 'PUT', employee);
      showAlert('Employee updated successfully!');
    } else {
      await apiCall('Employee', 'POST', employee);
      showAlert('Employee created successfully!');
    }
    
    bootstrap.Modal.getInstance(document.getElementById('employeeModal')).hide();
    loadEmployees();
  } catch (error) {
    showAlert(`Error saving employee: ${error.message}`, 'danger');
  }
}

function deleteEmployee(id) {
  currentDeleteId = id;
  currentDeleteEntity = 'Employee';
  currentDeleteCallback = async () => {
    try {
      await apiCall(`Employee/${id}`, 'DELETE');
      showAlert('Employee deleted successfully!');
      loadEmployees();
    } catch (error) {
      showAlert(`Error deleting employee: ${error.message}`, 'danger');
    }
  };
  
  const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
  modal.show();
}

// ==================== CLASSES (ADMIN / GENERIC) ====================
async function loadClasses() {
  try {
    const classes = await apiCall('Class');
    // Find table body in classes-section (for homepage) or admin section
    const classesSection = document.getElementById('classes-section');
    const adminSection = document.getElementById('admin-section');
    let tbody = null;
    
    // Prioritize classes-section if it's visible, otherwise use admin section
    if (classesSection && classesSection.style.display !== 'none') {
      tbody = classesSection.querySelector('#classes-table-body');
    } else if (adminSection && adminSection.style.display !== 'none') {
      tbody = adminSection.querySelector('#classes-table-body');
    } else {
      // Fallback to first found
      tbody = document.getElementById('classes-table-body');
    }
    
    if (!tbody) {
      console.error('Classes table body not found');
      return;
    }
    
    if (classes.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10" class="text-center">No classes found</td></tr>';
      return;
    }
    
    tbody.innerHTML = classes.map(cls => {
      const startTime = formatTimeSpan(cls.startTime);
      const endTime = formatTimeSpan(cls.endTime);
      return `
        <tr>
          <td>${cls.classId}</td>
          <td>${cls.title}</td>
          <td>${cls.classType}</td>
          <td>${cls.trainerId}</td>
          <td>${cls.location}</td>
          <td>${new Date(cls.startDate).toLocaleDateString()}</td>
          <td>${startTime} - ${endTime}</td>
          <td>$${parseFloat(cls.price).toFixed(2)}</td>
          <td>${cls.maxCapacity}</td>
          <td>
            <button class="btn btn-sm btn-primary" onclick="editClass(${cls.classId})">
              <i class="bi bi-pencil"></i> Edit
            </button>
            <button class="btn btn-sm btn-danger" onclick="deleteClass(${cls.classId})">
              <i class="bi bi-trash"></i> Delete
            </button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    showAlert(`Error loading classes: ${error.message}`, 'danger');
    const classesSection = document.getElementById('classes-section');
    const adminSection = document.getElementById('admin-section');
    let tbody = null;
    
    if (classesSection && classesSection.style.display !== 'none') {
      tbody = classesSection.querySelector('#classes-table-body');
    } else if (adminSection && adminSection.style.display !== 'none') {
      tbody = adminSection.querySelector('#classes-table-body');
    } else {
      tbody = document.getElementById('classes-table-body');
    }
    
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="10" class="text-center text-danger">Error loading data</td></tr>';
    }
  }
}

// ==================== CLASSES (TRAINER VIEW) ====================
// Trainers should only see classes that belong to them.
async function loadTrainerClasses() {
  try {
    if (!currentUser || currentUser.userType !== 'trainer') {
      showAlert('Please log in as a trainer to view your classes.', 'warning');
      return;
    }

    // Call trainer-specific endpoint; keeps customer/admin behavior unchanged.
    const classes = await apiCall(`Class/by-trainer/${currentUser.userId}`);

    // Trainer uses the main classes table, not the admin tab.
    const classesSection = document.getElementById('classes-section');
    let tbody = null;

    if (classesSection) {
      tbody = classesSection.querySelector('#classes-table-body');
    } else {
      tbody = document.getElementById('classes-table-body');
    }

    if (!tbody) {
      console.error('Trainer classes table body not found');
      return;
    }

    if (!classes || classes.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10" class="text-center">No classes found for this trainer</td></tr>';
      return;
    }

    tbody.innerHTML = classes.map(cls => {
      const startTime = formatTimeSpan(cls.startTime);
      const endTime = formatTimeSpan(cls.endTime);
      return `
        <tr>
          <td>${cls.classId}</td>
          <td>${cls.title}</td>
          <td>${cls.classType}</td>
          <td>${cls.trainerId}</td>
          <td>${cls.location}</td>
          <td>${new Date(cls.startDate).toLocaleDateString()}</td>
          <td>${startTime} - ${endTime}</td>
          <td>$${parseFloat(cls.price).toFixed(2)}</td>
          <td>${cls.maxCapacity}</td>
          <td>
            <button class="btn btn-sm btn-primary" onclick="editClass(${cls.classId})">
              <i class="bi bi-pencil"></i> Edit
            </button>
            <button class="btn btn-sm btn-danger" onclick="deleteClass(${cls.classId})">
              <i class="bi bi-trash"></i> Delete
            </button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    showAlert(`Error loading trainer classes: ${error.message}`, 'danger');

    const classesSection = document.getElementById('classes-section');
    let tbody = null;

    if (classesSection) {
      tbody = classesSection.querySelector('#classes-table-body');
    } else {
      tbody = document.getElementById('classes-table-body');
    }

    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="10" class="text-center text-danger">Error loading data</td></tr>';
    }
  }
}

function formatTimeSpan(timeSpan) {
  if (typeof timeSpan === 'string') {
    const parts = timeSpan.split(':');
    return `${parts[0]}:${parts[1]}`;
  }
  const hours = Math.floor(timeSpan / 36000000000);
  const minutes = Math.floor((timeSpan % 36000000000) / 600000000);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function openClassModal(cls = null) {
  const modal = new bootstrap.Modal(document.getElementById('classModal'));
  const form = document.getElementById('classForm');
  form.reset();
  document.getElementById('classId').value = '';
  
  if (cls) {
    document.getElementById('classModalTitle').textContent = 'Edit Class';
    document.getElementById('classId').value = cls.classId;
    document.getElementById('classTitle').value = cls.title;
    document.getElementById('classType').value = cls.classType;
    document.getElementById('classDescription').value = cls.description;
    document.getElementById('classTrainerId').value = cls.trainerId;
    document.getElementById('classLocation').value = cls.location;
    document.getElementById('classStartDate').value = cls.startDate.split('T')[0];
    document.getElementById('classEndDate').value = cls.endDate.split('T')[0];
    document.getElementById('classCategory').value = cls.category || '';
    document.getElementById('classMaxCapacity').value = cls.maxCapacity;
    document.getElementById('classPrice').value = cls.price;
    
    // Handle time spans
    const startTime = formatTimeSpan(cls.startTime);
    const endTime = formatTimeSpan(cls.endTime);
    document.getElementById('classStartTime').value = startTime;
    document.getElementById('classEndTime').value = endTime;
  } else {
    document.getElementById('classModalTitle').textContent = 'Add Class';
  }
  
  modal.show();
}

async function editClass(id) {
  try {
    const cls = await apiCall(`Class/${id}`);
    openClassModal(cls);
  } catch (error) {
    showAlert(`Error loading class: ${error.message}`, 'danger');
  }
}

async function saveClass() {
  const form = document.getElementById('classForm');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  
  const startTimeStr = document.getElementById('classStartTime').value;
  const endTimeStr = document.getElementById('classEndTime').value;
  
  const classItem = {
    classId: parseInt(document.getElementById('classId').value) || 0,
    trainerId: parseInt(document.getElementById('classTrainerId').value),
    classType: document.getElementById('classType').value,
    title: document.getElementById('classTitle').value,
    description: document.getElementById('classDescription').value,
    location: document.getElementById('classLocation').value,
    startTime: startTimeStr,
    endTime: endTimeStr,
    startDate: document.getElementById('classStartDate').value,
    endDate: document.getElementById('classEndDate').value,
    maxCapacity: parseInt(document.getElementById('classMaxCapacity').value),
    price: parseFloat(document.getElementById('classPrice').value),
    category: document.getElementById('classCategory').value || null
  };
  
  try {
    if (classItem.classId > 0) {
      await apiCall(`Class/${classItem.classId}`, 'PUT', classItem);
      showAlert('Class updated successfully!');
    } else {
      await apiCall('Class', 'POST', classItem);
      showAlert('Class created successfully!');
    }
    
    bootstrap.Modal.getInstance(document.getElementById('classModal')).hide();
    loadClasses();
  } catch (error) {
    showAlert(`Error saving class: ${error.message}`, 'danger');
  }
}

function deleteClass(id) {
  currentDeleteId = id;
  currentDeleteEntity = 'Class';
  currentDeleteCallback = async () => {
    try {
      await apiCall(`Class/${id}`, 'DELETE');
      showAlert('Class deleted successfully!');
      loadClasses();
    } catch (error) {
      showAlert(`Error deleting class: ${error.message}`, 'danger');
    }
  };
  
  const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
  modal.show();
}

// ==================== BOOKINGS (TRAINER VIEW) ====================
// Trainers should only see bookings for classes they teach.
async function loadTrainerBookings() {
  try {
    if (!currentUser || currentUser.userType !== 'trainer') {
      showAlert('Please log in as a trainer to view your class bookings.', 'warning');
      return;
    }

    // Call trainer-specific endpoint; keeps customer/admin behavior unchanged.
    const bookings = await apiCall(`Booking/by-trainer/${currentUser.userId}`);
    
    // Find table body in bookings-section (for trainer view) or admin section
    const bookingsSection = document.getElementById('bookings-section');
    const adminSection = document.getElementById('admin-section');
    let tbody = null;
    
    // Prioritize bookings-section if it's visible, otherwise use admin section
    if (bookingsSection && bookingsSection.style.display !== 'none') {
      tbody = bookingsSection.querySelector('#bookings-table-body');
    } else if (adminSection && adminSection.style.display !== 'none') {
      tbody = adminSection.querySelector('#bookings-table-body');
    } else {
      // Fallback to first found
      tbody = document.getElementById('bookings-table-body');
    }
    
    if (!tbody) {
      console.error('Bookings table body not found');
      return;
    }
    
    if (!bookings || bookings.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="text-center">No bookings found for your classes</td></tr>';
      return;
    }
    
    tbody.innerHTML = bookings.map(booking => `
      <tr>
        <td>${booking.bookingId}</td>
        <td>${booking.classId}</td>
        <td>${booking.petId}</td>
        <td>${booking.employeeId}</td>
        <td>${new Date(booking.bookingDate).toLocaleString()}</td>
        <td><span class="badge bg-${getStatusBadgeColor(booking.status)}">${booking.status}</span></td>
        <td><span class="badge bg-${getPaymentBadgeColor(booking.paymentStatus)}">${booking.paymentStatus}</span></td>
        <td>$${parseFloat(booking.amountPaid).toFixed(2)}</td>
        <td>
          <button class="btn btn-sm btn-primary" onclick="editBooking(${booking.bookingId})">
            <i class="bi bi-pencil"></i> Edit
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteBooking(${booking.bookingId})">
            <i class="bi bi-trash"></i> Delete
          </button>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    showAlert(`Error loading trainer bookings: ${error.message}`, 'danger');
    
    // Find table body in the visible section
    const bookingsSection = document.getElementById('bookings-section');
    const adminSection = document.getElementById('admin-section');
    let tbody = null;
    
    if (bookingsSection && bookingsSection.style.display !== 'none') {
      tbody = bookingsSection.querySelector('#bookings-table-body');
    } else if (adminSection && adminSection.style.display !== 'none') {
      tbody = adminSection.querySelector('#bookings-table-body');
    } else {
      tbody = document.getElementById('bookings-table-body');
    }
    
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="9" class="text-center text-danger">Error loading data</td></tr>';
    }
  }
}

// ==================== BOOKINGS ====================
async function loadBookings() {
  try {
    const bookings = await apiCall('Booking');
    
    // Find table body in bookings-section (for standalone view) or admin section
    const bookingsSection = document.getElementById('bookings-section');
    const adminSection = document.getElementById('admin-section');
    let tbody = null;
    
    // Prioritize bookings-section if it's visible, otherwise use admin section
    if (bookingsSection && bookingsSection.style.display !== 'none') {
      tbody = bookingsSection.querySelector('#bookings-table-body');
    } else if (adminSection && adminSection.style.display !== 'none') {
      tbody = adminSection.querySelector('#bookings-table-body');
    } else {
      // Fallback to first found
      tbody = document.getElementById('bookings-table-body');
    }
    
    if (!tbody) {
      console.error('Bookings table body not found');
      return;
    }
    
    if (!bookings || bookings.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="text-center">No bookings found</td></tr>';
      return;
    }
    
    tbody.innerHTML = bookings.map(booking => `
      <tr>
        <td>${booking.bookingId}</td>
        <td>${booking.classId}</td>
        <td>${booking.petId}</td>
        <td>${booking.employeeId}</td>
        <td>${new Date(booking.bookingDate).toLocaleString()}</td>
        <td><span class="badge bg-${getStatusBadgeColor(booking.status)}">${booking.status}</span></td>
        <td><span class="badge bg-${getPaymentBadgeColor(booking.paymentStatus)}">${booking.paymentStatus}</span></td>
        <td>$${parseFloat(booking.amountPaid).toFixed(2)}</td>
        <td>
          <button class="btn btn-sm btn-primary" onclick="editBooking(${booking.bookingId})">
            <i class="bi bi-pencil"></i> Edit
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteBooking(${booking.bookingId})">
            <i class="bi bi-trash"></i> Delete
          </button>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    showAlert(`Error loading bookings: ${error.message}`, 'danger');
    
    // Find table body in the visible section
    const bookingsSection = document.getElementById('bookings-section');
    const adminSection = document.getElementById('admin-section');
    let tbody = null;
    
    if (bookingsSection && bookingsSection.style.display !== 'none') {
      tbody = bookingsSection.querySelector('#bookings-table-body');
    } else if (adminSection && adminSection.style.display !== 'none') {
      tbody = adminSection.querySelector('#bookings-table-body');
    } else {
      tbody = document.getElementById('bookings-table-body');
    }
    
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="9" class="text-center text-danger">Error loading data</td></tr>';
    }
  }
}

function getStatusBadgeColor(status) {
  const colors = {
    'Confirmed': 'success',
    'Pending': 'warning',
    'Cancelled': 'danger',
    'Completed': 'info'
  };
  return colors[status] || 'secondary';
}

function getPaymentBadgeColor(status) {
  const colors = {
    'Paid': 'success',
    'Pending': 'warning',
    'Refunded': 'danger'
  };
  return colors[status] || 'secondary';
}

function openBookingModal(booking = null) {
  const modal = new bootstrap.Modal(document.getElementById('bookingModal'));
  const form = document.getElementById('bookingForm');
  form.reset();
  document.getElementById('bookingId').value = '';
  
  if (booking) {
    document.getElementById('bookingModalTitle').textContent = 'Edit Booking';
    document.getElementById('bookingId').value = booking.bookingId;
    document.getElementById('bookingClassId').value = booking.classId;
    document.getElementById('bookingPetId').value = booking.petId;
    document.getElementById('bookingEmployeeId').value = booking.employeeId;
    
    // Format datetime for datetime-local input
    const bookingDate = new Date(booking.bookingDate);
    const year = bookingDate.getFullYear();
    const month = String(bookingDate.getMonth() + 1).padStart(2, '0');
    const day = String(bookingDate.getDate()).padStart(2, '0');
    const hours = String(bookingDate.getHours()).padStart(2, '0');
    const minutes = String(bookingDate.getMinutes()).padStart(2, '0');
    document.getElementById('bookingDate').value = `${year}-${month}-${day}T${hours}:${minutes}`;
    
    document.getElementById('bookingStatus').value = booking.status;
    document.getElementById('bookingPaymentStatus').value = booking.paymentStatus;
    document.getElementById('bookingAmountPaid').value = booking.amountPaid;
  } else {
    document.getElementById('bookingModalTitle').textContent = 'Add Booking';
  }
  
  modal.show();
}

async function editBooking(id) {
  try {
    const booking = await apiCall(`Booking/${id}`);
    openBookingModal(booking);
  } catch (error) {
    showAlert(`Error loading booking: ${error.message}`, 'danger');
  }
}

async function saveBooking() {
  const form = document.getElementById('bookingForm');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  
  const booking = {
    bookingId: parseInt(document.getElementById('bookingId').value) || 0,
    classId: parseInt(document.getElementById('bookingClassId').value),
    petId: parseInt(document.getElementById('bookingPetId').value),
    employeeId: parseInt(document.getElementById('bookingEmployeeId').value),
    bookingDate: document.getElementById('bookingDate').value,
    status: document.getElementById('bookingStatus').value,
    paymentStatus: document.getElementById('bookingPaymentStatus').value,
    amountPaid: parseFloat(document.getElementById('bookingAmountPaid').value)
  };
  
  try {
    if (booking.bookingId > 0) {
      await apiCall(`Booking/${booking.bookingId}`, 'PUT', booking);
      showAlert('Booking updated successfully!');
    } else {
      await apiCall('Booking', 'POST', booking);
      showAlert('Booking created successfully!');
    }
    
    bootstrap.Modal.getInstance(document.getElementById('bookingModal')).hide();
    loadBookings();
  } catch (error) {
    showAlert(`Error saving booking: ${error.message}`, 'danger');
  }
}

function deleteBooking(id) {
  currentDeleteId = id;
  currentDeleteEntity = 'Booking';
  currentDeleteCallback = async () => {
    try {
      await apiCall(`Booking/${id}`, 'DELETE');
      showAlert('Booking deleted successfully!');
      loadBookings();
    } catch (error) {
      showAlert(`Error deleting booking: ${error.message}`, 'danger');
    }
  };
  
  const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
  modal.show();
}

// ==================== HOME STATS ====================
async function loadHomeStats() {
  try {
    const [customers, pets, classes, bookings] = await Promise.all([
      apiCall('Customer').catch(() => []),
      apiCall('Pet').catch(() => []),
      apiCall('Class').catch(() => []),
      apiCall('Booking').catch(() => [])
    ]);
    
    document.getElementById('stat-customers').textContent = customers.length || 0;
    document.getElementById('stat-pets').textContent = pets.length || 0;
    document.getElementById('stat-classes').textContent = classes.length || 0;
    document.getElementById('stat-bookings').textContent = bookings.length || 0;
  } catch (error) {
    console.error('Error loading stats:', error);
    // Set to 0 if error
    document.getElementById('stat-customers').textContent = '0';
    document.getElementById('stat-pets').textContent = '0';
    document.getElementById('stat-classes').textContent = '0';
    document.getElementById('stat-bookings').textContent = '0';
  }
}

// ==================== CREATE PROFILE FORM ====================
function setupCreateProfileForm() {
  const form = document.getElementById('createProfileForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveProfileFromForm(form);
    });
  }
}

async function saveProfileFromForm(form) {



  const firstNameEl = form.querySelector('#profileFirstName');
  const lastNameEl  = form.querySelector('#profileLastName');
  const phoneEl     = form.querySelector('#profilePhone');
  const addressEl   = form.querySelector('#profileAddress');

  // Safety check
  if (!firstNameEl || !lastNameEl || !phoneEl || !addressEl) {
    console.error('One or more input elements not found in the form');
    return false;
  }

  const firstName = firstNameEl.value.trim();
  const lastName  = lastNameEl.value.trim();
  const phone     = phoneEl.value.trim();
  const address   = addressEl.value.trim();

  if (!firstName || !lastName || !phone) {
    alert('Please fill in all required fields.');
    return false;
  }
//   console.log("saveProfileFromForm called");
//   const form = document.getElementById('createProfileForm');
//   if (!form) {
//     showAlert('Form not found', 'danger');
//     return false;
//   }
  
//   if (!form.checkValidity()) {
//     form.reportValidity();
//     return false;
//   }
  
//   // Safely get form elements and values
//   const firstNameEl = document.getElementById('profileFirstName');
//   const lastNameEl = document.getElementById('profileLastName');
//   const phoneEl = document.getElementById('profilePhone');
//   const addressEl = document.getElementById('profileAddress');
  
//   // Check if elements exist
//   if (!firstNameEl || !lastNameEl || !phoneEl) {
//     showAlert('Form fields not found', 'danger');
//     return false;
//   }
  
//   console.log('firstNameEl:', firstNameEl);
// console.log('lastNameEl:', lastNameEl);
// console.log('phoneEl:', phoneEl);
// console.log('addressEl:', addressEl);
//   // Safely get and trim values (handle undefined/null)
//   const firstName = (firstNameEl.value || '').trim();
//   const lastName = (lastNameEl.value || '').trim();
//   const phoneNum = (phoneEl.value || '').trim();
//   const address = addressEl ? (addressEl.value || '').trim() : '';

//   // Validate required fields
//   if (!firstName) {
//     showAlert('First name is required', 'danger');
//     firstNameEl.focus();
//     return false;
//   }
//   if (!lastName) {
//     showAlert('Last name is required', 'danger');
//     lastNameEl.focus();
//     return false;
//   }
//   if (!phoneNum) {
//     showAlert('Phone number is required', 'danger');
//     phoneEl.focus();
//     return false;
//   }
  
  // Build customer object
  const customer = {
    firstName: firstName,
    lastName: lastName,
    phoneNum: phone,
    address: address || null
  };

  
  try {
    await apiCall('Customer', 'POST', customer);
    form.reset();
    
    // Update stats
    loadHomeStats();
    
    return true;
  } catch (error) {
    showAlert(`Error creating profile: ${error.message}`, 'danger');
    return false;
  }
}

// ==================== DELETE MODAL SETUP ====================
function setupDeleteModal() {
  document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
    if (currentDeleteCallback) {
      currentDeleteCallback();
      currentDeleteCallback = null;
      bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide();
    }
  });
}

// ==================== LOGIN FUNCTIONALITY ====================
function setupLoginForm() {
  const form = document.getElementById('loginForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await handleLogin();
    });
  }
}

// Clear login form fields
function clearLoginForm() {
  const firstNameField = document.getElementById('loginFirstName');
  const lastNameField = document.getElementById('loginLastName');
  const phoneField = document.getElementById('loginPhoneNumber');
  
  if (firstNameField) firstNameField.value = '';
  if (lastNameField) lastNameField.value = '';
  if (phoneField) phoneField.value = '';
}

async function handleLogin() {
  const form = document.getElementById('loginForm');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const loginData = {
    firstName: document.getElementById('loginFirstName').value.trim(),
    lastName: document.getElementById('loginLastName').value.trim(),
    phoneNumber: document.getElementById('loginPhoneNumber').value.trim()
  };

  try {
    const response = await apiCall('Login', 'POST', loginData);
    
    if (response && response.success) {
      // Store user info
      currentUser = response;
      sessionStorage.setItem('currentUser', JSON.stringify(response));
      
      // Update login/logout buttons
      updateLoginLogoutButtons();
      
      showAlert(`Welcome back, ${response.firstName} ${response.lastName}!`, 'success');
      
      // Redirect based on user type
      if (response.userType === 'customer') {
        setTimeout(() => {
          showSection('customer-dashboard');
          updateCustomerDashboard();
        }, 1000);
      } else if (response.userType === 'trainer') {
        setTimeout(() => {
          showSection('trainer-dashboard');
          updateTrainerDashboard();
        }, 1000);
      } else if (response.userType === 'admin') {
        // Set admin flag in localStorage
        localStorage.setItem('isAdminLoggedIn', 'true');
        setTimeout(() => {
          showSection('admin');
          loadAdminData();
        }, 1000);
      }
    } else {
      showAlert('Invalid credentials. Please check your information and try again.', 'danger');
    }
  } catch (error) {
    const errorMessage = error.message || 'Login failed. Please try again.';
    showAlert(errorMessage, 'danger');
  }
}

function updateCustomerDashboard() {
  if (currentUser && currentUser.userType === 'customer') {
    document.getElementById('customerDashboardName').textContent = 
      `${currentUser.firstName} ${currentUser.lastName}`;
    document.getElementById('customerDashboardPhone').textContent = currentUser.phoneNumber;
  }
}

function updateTrainerDashboard() {
  if (currentUser && currentUser.userType === 'trainer') {
    document.getElementById('trainerDashboardName').textContent = 
      `${currentUser.firstName} ${currentUser.lastName}`;
    document.getElementById('trainerDashboardPhone').textContent = currentUser.phoneNumber;
  }
}

function logout() {
  currentUser = null;
  sessionStorage.removeItem('currentUser');
  
  // Clear login form fields
  clearLoginForm();
  
  // Update login/logout buttons
  updateLoginLogoutButtons();
  
  showAlert('You have been logged out successfully.', 'info');
  setTimeout(() => {
    showSection('home');
  }, 1000);
}

// ==================== ADMIN FUNCTIONALITY ====================
function checkAdminAccess() {
  const isAdminLoggedIn = localStorage.getItem('isAdminLoggedIn');
  return isAdminLoggedIn === 'true';
}

function adminLogout() {
  localStorage.removeItem('isAdminLoggedIn');
  currentUser = null;
  sessionStorage.removeItem('currentUser');
  
  // Clear login form fields
  clearLoginForm();
  
  updateLoginLogoutButtons();
  showAlert('You have been logged out successfully.', 'info');
  setTimeout(() => {
    showSection('home');
  }, 1000);
}

function loadAdminData() {
  // Load data for the active tab
  const activeTab = document.querySelector('#adminTabs .nav-link.active');
  if (activeTab) {
    const targetId = activeTab.getAttribute('data-bs-target');
    if (targetId === '#admin-customers-pane') {
      loadCustomers();
    } else if (targetId === '#admin-pets-pane') {
      loadPets();
    } else if (targetId === '#admin-trainers-pane') {
      loadTrainers();
    } else if (targetId === '#admin-employees-pane') {
      loadEmployees();
    } else if (targetId === '#admin-classes-pane') {
      loadClasses();
    } else if (targetId === '#admin-bookings-pane') {
      loadBookings();
    }
  } else {
    // Default to customers
    loadCustomers();
  }
  
  // Set up tab change listeners (only once)
  const adminTabs = document.getElementById('adminTabs');
  if (adminTabs && !adminTabs.dataset.listenersAttached) {
    adminTabs.dataset.listenersAttached = 'true';
    const tabButtons = document.querySelectorAll('#adminTabs .nav-link');
    tabButtons.forEach(button => {
      button.addEventListener('shown.bs.tab', (e) => {
        const targetId = e.target.getAttribute('data-bs-target');
        if (targetId === '#admin-customers-pane') {
          loadCustomers();
        } else if (targetId === '#admin-pets-pane') {
          loadPets();
        } else if (targetId === '#admin-trainers-pane') {
          loadTrainers();
        } else if (targetId === '#admin-employees-pane') {
          loadEmployees();
        } else if (targetId === '#admin-classes-pane') {
          loadClasses();
        } else if (targetId === '#admin-bookings-pane') {
          loadBookings();
        }
      });
    });
  }
}

// Update login/logout button visibility based on login state
function updateLoginLogoutButtons() {
  const loginNavItem = document.getElementById('login-nav-item');
  const logoutNavItem = document.getElementById('logout-nav-item');
  const viewProfileNavItem = document.getElementById('view-profile-nav-item');
  
  if (currentUser) {
    // User is logged in - show logout and view profile, hide login
    if (loginNavItem) loginNavItem.style.display = 'none';
    if (logoutNavItem) logoutNavItem.style.display = 'block';
    if (viewProfileNavItem) viewProfileNavItem.style.display = 'block';
  } else {
    // User is not logged in - show login, hide logout and view profile
    if (loginNavItem) loginNavItem.style.display = 'block';
    if (logoutNavItem) logoutNavItem.style.display = 'none';
    if (viewProfileNavItem) viewProfileNavItem.style.display = 'none';
  }
  
  // Update create profile visibility
  updateCreateProfileVisibility();
}

// Update create profile visibility based on login state
function updateCreateProfileVisibility() {
  const createProfileBtn = document.getElementById('createProfileBtn');
  
  if (createProfileBtn) {
    if (currentUser) {
      // User is logged in - hide create profile button
      createProfileBtn.style.display = 'none';
    } else {
      // User is not logged in - show create profile button
      createProfileBtn.style.display = 'block';
    }
  }
}

// ==================== CREATE PROFILE MODAL ====================
function openCreateProfileModal() {
  if (currentUser) {
    showAlert('You are already logged in.', 'info');
    return;
  }
  
  const modal = new bootstrap.Modal(document.getElementById('createProfileModal'));
  const form = document.getElementById('createProfileForm');
  form.reset();
  modal.show();
}

async function submitCreateProfileModal() {

  const form = document.getElementById('createProfileForm');  // same form
  if (!form) {
    console.error('Form not found');
    return false;
  }

  const success = await saveProfileFromForm(form);
}
  // Use the existing saveProfileFromForm function
//   const success = await saveProfileFromForm();
  
//   if (success) {
//     // Close the modal after successful submission
//     const modal = bootstrap.Modal.getInstance(document.getElementById('createProfileModal'));
//     if (modal) {
//       modal.hide();
//     }
//     showAlert('Profile created successfully! You can now log in.', 'success');
//   }
// }

// ==================== VIEW PROFILE ====================
async function openViewProfileModal() {
  if (!currentUser) {
    showAlert('Please log in to view your profile.', 'warning');
    showSection('login');
    return;
  }

  const modal = new bootstrap.Modal(document.getElementById('viewProfileModal'));
  
  try {
    let profileData;
    
    // Fetch profile data based on user type
    if (currentUser.userType === 'customer') {
      profileData = await apiCall(`Customer/${currentUser.userId}`);
    } else if (currentUser.userType === 'trainer') {
      profileData = await apiCall(`Trainer/${currentUser.userId}`);
    } else {
      showAlert('Unable to load profile information.', 'danger');
      return;
    }
    
    // Populate profile modal
    document.getElementById('profileName').textContent = 
      `${profileData.firstName} ${profileData.lastName}`;
    document.getElementById('profileUserType').textContent = 
      currentUser.userType.charAt(0).toUpperCase() + currentUser.userType.slice(1);
    document.getElementById('profileFirstName').textContent = profileData.firstName || '-';
    document.getElementById('profileLastName').textContent = profileData.lastName || '-';
    document.getElementById('profilePhone').textContent = profileData.phoneNum || '-';
    
    // Show/hide user type specific details
    if (currentUser.userType === 'customer') {
      document.getElementById('profileCustomerDetails').style.display = 'block';
      document.getElementById('profileTrainerDetails').style.display = 'none';
      document.getElementById('profileAddress').textContent = profileData.address || 'Not provided';
    } else if (currentUser.userType === 'trainer') {
      document.getElementById('profileCustomerDetails').style.display = 'none';
      document.getElementById('profileTrainerDetails').style.display = 'block';
      document.getElementById('profileSpeciality').textContent = profileData.speciality || 'Not specified';
    }
    
    modal.show();
  } catch (error) {
    showAlert(`Error loading profile: ${error.message}`, 'danger');
  }
}

// ==================== CUSTOMER CLASSES PAGE ====================
let allCustomerClasses = [];
let customerPets = [];

async function loadCustomerClasses() {
  try {
    const classes = await apiCall('Class');
    allCustomerClasses = classes || [];
    
    // Populate filter dropdowns
    populateCustomerFilters();
    
    // Load customer pets
    await loadCustomerPets();
    
    // Display classes
    filterCustomerClasses();
  } catch (error) {
    showAlert(`Error loading classes: ${error.message}`, 'danger');
    document.getElementById('customer-classes-container').innerHTML = 
      '<div class="col-12 text-center text-danger">Error loading classes</div>';
  }
}

function populateCustomerFilters() {
  const typeSelect = document.getElementById('filterType');
  const categorySelect = document.getElementById('filterCategory');
  
  // Get unique types and categories
  const types = [...new Set(allCustomerClasses.map(c => c.classType).filter(Boolean))];
  const categories = [...new Set(allCustomerClasses.map(c => c.category).filter(Boolean))];
  
  // Populate type filter
  types.forEach(type => {
    const option = document.createElement('option');
    option.value = type;
    option.textContent = type;
    typeSelect.appendChild(option);
  });
  
  // Populate category filter
  categories.forEach(category => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    categorySelect.appendChild(option);
  });
}

async function loadCustomerPets() {
  if (!currentUser || currentUser.userType !== 'customer') {
    customerPets = [];
    return;
  }
  
  try {
    const pets = await apiCall('Pet');
    customerPets = (pets || []).filter(pet => pet.customerId === currentUser.userId);
  } catch (error) {
    console.error('Error loading pets:', error);
    customerPets = [];
  }
}

function filterCustomerClasses() {
  const searchTitle = document.getElementById('searchTitle').value.toLowerCase();
  const filterType = document.getElementById('filterType').value;
  const filterCategory = document.getElementById('filterCategory').value;
  const filterDate = document.getElementById('filterDate').value;
  const filterTrainer = document.getElementById('filterTrainer').value;
  
  let filtered = allCustomerClasses.filter(cls => {
    const matchesTitle = !searchTitle || cls.title.toLowerCase().includes(searchTitle) || 
                        cls.classType.toLowerCase().includes(searchTitle);
    const matchesType = !filterType || cls.classType === filterType;
    const matchesCategory = !filterCategory || cls.category === filterCategory;
    const matchesDate = !filterDate || cls.startDate.startsWith(filterDate);
    const matchesTrainer = !filterTrainer || cls.trainerId.toString() === filterTrainer;
    
    return matchesTitle && matchesType && matchesCategory && matchesDate && matchesTrainer;
  });
  
  displayCustomerClasses(filtered);
}

function clearCustomerFilters() {
  document.getElementById('searchTitle').value = '';
  document.getElementById('filterType').value = '';
  document.getElementById('filterCategory').value = '';
  document.getElementById('filterDate').value = '';
  document.getElementById('filterTrainer').value = '';
  filterCustomerClasses();
}

function displayCustomerClasses(classes) {
  const container = document.getElementById('customer-classes-container');
  
  if (!classes || classes.length === 0) {
    container.innerHTML = '<div class="col-12 text-center text-muted">No classes found matching your criteria.</div>';
    return;
  }
  
  container.innerHTML = classes.map(cls => {
    const startDate = new Date(cls.startDate);
    const endDate = new Date(cls.endDate);
    const startTime = cls.startTime || '-';
    const endTime = cls.endTime || '-';
    
    return `
      <div class="col-md-6 col-lg-4 mb-4">
        <div class="card h-100 shadow-sm customer-class-card">
          <div class="card-body">
            <h5 class="card-title">${cls.title}</h5>
            <p class="text-muted mb-2"><strong>Type:</strong> ${cls.classType}</p>
            ${cls.category ? `<p class="text-muted mb-2"><strong>Category:</strong> ${cls.category}</p>` : ''}
            <p class="text-muted mb-2"><strong>Trainer ID:</strong> ${cls.trainerId}</p>
            <p class="text-muted mb-2"><strong>Location:</strong> ${cls.location}</p>
            <p class="text-muted mb-2"><strong>Date:</strong> ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}</p>
            <p class="text-muted mb-2"><strong>Time:</strong> ${startTime} - ${endTime}</p>
            <p class="text-muted mb-2"><strong>Capacity:</strong> ${cls.maxCapacity} spots</p>
            <p class="text-primary mb-3"><strong>Price:</strong> $${parseFloat(cls.price).toFixed(2)}</p>
            ${cls.description ? `<p class="card-text small text-muted mb-3">${cls.description.substring(0, 100)}${cls.description.length > 100 ? '...' : ''}</p>` : ''}
            <div class="d-grid gap-2">
              <button class="btn btn-primary" onclick="openCustomerBookingModal(${cls.classId}, ${parseFloat(cls.price).toFixed(2)})">
                <i class="bi bi-calendar-check"></i> Book Class
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function openCustomerBookingModal(classId, price) {
  if (!currentUser || currentUser.userType !== 'customer') {
    showAlert('Please log in as a customer to book classes.', 'warning');
    showSection('login');
    return;
  }
  
  // Load pets if not already loaded
  if (customerPets.length === 0) {
    loadCustomerPets();
  }
  
  const modal = new bootstrap.Modal(document.getElementById('customerBookingModal'));
  const form = document.getElementById('customerBookingForm');
  form.reset();
  
  document.getElementById('customerBookingClassId').value = classId;
  document.getElementById('customerBookingAmount').value = price || '0.00';
  
  // Populate pets dropdown
  const petSelect = document.getElementById('customerBookingPet');
  petSelect.innerHTML = '<option value="">-- Select a pet --</option>';
  
  if (customerPets.length === 0) {
    petSelect.innerHTML = '<option value="">No pets available. Please add a pet first.</option>';
    petSelect.disabled = true;
  } else {
    customerPets.forEach(pet => {
      const option = document.createElement('option');
      option.value = pet.petId;
      option.textContent = `${pet.name} (${pet.species}${pet.breed ? ' - ' + pet.breed : ''})`;
      petSelect.appendChild(option);
    });
    petSelect.disabled = false;
  }
  
  // Set default booking date to now
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  document.getElementById('customerBookingDate').value = `${year}-${month}-${day}T${hours}:${minutes}`;
  
  modal.show();
}

async function submitCustomerBooking() {
  const form = document.getElementById('customerBookingForm');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  
  if (!currentUser || currentUser.userType !== 'customer') {
    showAlert('Please log in as a customer to book classes.', 'warning');
    return;
  }
  
  // Get first available employee ID (you might want to improve this)
  let employeeId = 1;
  try {
    const employees = await apiCall('Employee');
    if (employees && employees.length > 0) {
      employeeId = employees[0].employeeId;
    }
  } catch (error) {
    console.error('Error getting employee:', error);
  }
  
  const booking = {
    classId: parseInt(document.getElementById('customerBookingClassId').value),
    petId: parseInt(document.getElementById('customerBookingPet').value),
    employeeId: employeeId,
    bookingDate: document.getElementById('customerBookingDate').value,
    status: document.getElementById('customerBookingStatus').value,
    paymentStatus: document.getElementById('customerBookingPaymentStatus').value,
    amountPaid: parseFloat(document.getElementById('customerBookingAmount').value)
  };
  
  try {
    await apiCall('Booking', 'POST', booking);
    showAlert('Class booked successfully!', 'success');
    bootstrap.Modal.getInstance(document.getElementById('customerBookingModal')).hide();
    
    // Reload pets in case a new one was added
    await loadCustomerPets();
  } catch (error) {
    showAlert(`Error booking class: ${error.message}`, 'danger');
  }
}

function openCustomerPetModal() {
  if (!currentUser || currentUser.userType !== 'customer') {
    showAlert('Please log in as a customer to add pets.', 'warning');
    showSection('login');
    return;
  }
  
  // Use the main pet modal for consistency
  openPetModalForCustomer(null);
}

async function submitCustomerPet() {
  // This function is kept for backward compatibility with customerPetModal
  // But we'll use saveCustomerPet() for the main pet modal
  const form = document.getElementById('customerPetForm');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  
  if (!currentUser || currentUser.userType !== 'customer') {
    showAlert('Please log in as a customer to add pets.', 'warning');
    return;
  }
  
  const pet = {
    customerId: currentUser.userId,
    name: document.getElementById('customerPetName').value,
    species: document.getElementById('customerPetSpecies').value,
    breed: document.getElementById('customerPetBreed').value || null,
    birthDate: document.getElementById('customerPetBirthDate').value,
    notes: document.getElementById('customerPetNotes').value || null
  };
  
  try {
    await apiCall('Pet', 'POST', pet);
    showAlert('Pet added successfully!', 'success');
    bootstrap.Modal.getInstance(document.getElementById('customerPetModal')).hide();
    
    // Reload customer pets view if on that page
    const customerPetsSection = document.getElementById('customer-pets-section');
    if (customerPetsSection && customerPetsSection.style.display !== 'none') {
      await loadCustomerPetsForView();
    }
    
    // Reload pets array
    await loadCustomerPets();
    
    // If booking modal was open, refresh it
    const bookingModalElement = document.getElementById('customerBookingModal');
    const bookingModal = bootstrap.Modal.getInstance(bookingModalElement);
    if (bookingModal && bookingModalElement.classList.contains('show')) {
      const classId = document.getElementById('customerBookingClassId').value;
      const amount = document.getElementById('customerBookingAmount').value;
      bootstrap.Modal.getInstance(document.getElementById('customerPetModal')).hide();
      setTimeout(() => {
        openCustomerBookingModal(parseInt(classId), parseFloat(amount));
      }, 300);
    }
  } catch (error) {
    showAlert(`Error adding pet: ${error.message}`, 'danger');
  }
}

// ==================== CUSTOMER BOOKINGS ====================
async function loadCustomerBookings() {
  try {
    // Ensure customer pets are loaded
    await loadCustomerPets();
    
    if (!currentUser || currentUser.userType !== 'customer') {
      document.getElementById('customer-bookings-table-body').innerHTML = 
        '<tr><td colspan="7" class="text-center text-danger">Please log in as a customer to view bookings.</td></tr>';
      return;
    }

    if (customerPets.length === 0) {
      document.getElementById('customer-bookings-table-body').innerHTML = 
        '<tr><td colspan="7" class="text-center text-muted">No pets found. Please add a pet to make bookings.</td></tr>';
      return;
    }

    // Get all bookings
    const bookings = await apiCall('Booking');
    
    // Get all pets and classes for lookup
    const pets = await apiCall('Pet');
    const classes = await apiCall('Class');
    
    // Create lookup maps
    const petMap = new Map(pets.map(pet => [pet.petId, pet]));
    const classMap = new Map(classes.map(cls => [cls.classId, cls]));
    
    // Get customer's pet IDs
    const customerPetIds = new Set(customerPets.map(pet => pet.petId));
    
    // Filter bookings for customer's pets
    const customerBookings = bookings.filter(booking => customerPetIds.has(booking.petId));
    
    const tbody = document.getElementById('customer-bookings-table-body');
    
    if (customerBookings.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No bookings found.</td></tr>';
      return;
    }
    
    // Sort by booking date (newest first)
    customerBookings.sort((a, b) => new Date(b.bookingDate) - new Date(a.bookingDate));
    
    tbody.innerHTML = customerBookings.map(booking => {
      const pet = petMap.get(booking.petId);
      const classData = classMap.get(booking.classId);
      
      const petName = pet ? pet.name : 'Unknown Pet';
      const className = classData ? classData.title : 'Unknown Class';
      
      // Format class date and time
      let classDateTime = 'N/A';
      if (classData) {
        const startDate = new Date(classData.startDate);
        const startTime = classData.startTime || '';
        // Format date as MM/DD/YYYY and time as HH:mm
        const formattedDate = startDate.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: '2-digit', 
          day: '2-digit' 
        });
        // Extract hours and minutes from time string (HH:mm:ss)
        const timeParts = startTime.split(':');
        const formattedTime = timeParts.length >= 2 ? `${timeParts[0]}:${timeParts[1]}` : startTime;
        classDateTime = `${formattedDate} ${formattedTime}`;
      }
      
      // Format booking date
      const bookingDate = new Date(booking.bookingDate).toLocaleString();
      
      // Status badge
      const statusBadgeColor = getStatusBadgeColor(booking.status);
      const canCancel = booking.status !== 'Canceled' && booking.status !== 'Cancelled';
      
      return `
        <tr>
          <td>${booking.bookingId}</td>
          <td>${petName}</td>
          <td>${className}</td>
          <td>${classDateTime}</td>
          <td><span class="badge bg-${statusBadgeColor}">${booking.status}</span></td>
          <td>$${parseFloat(booking.amountPaid).toFixed(2)}</td>
          <td>
            ${canCancel ? `
              <button class="btn btn-sm btn-danger" onclick="cancelCustomerBooking(${booking.bookingId})">
                <i class="bi bi-x-circle"></i> Cancel
              </button>
            ` : '<span class="text-muted">-</span>'}
          </td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    showAlert(`Error loading bookings: ${error.message}`, 'danger');
    document.getElementById('customer-bookings-table-body').innerHTML = 
      '<tr><td colspan="7" class="text-center text-danger">Error loading data</td></tr>';
  }
}

async function cancelCustomerBooking(bookingId) {
  if (!confirm('Are you sure you want to cancel this booking?')) {
    return;
  }

  try {
    // Get the current booking
    const bookings = await apiCall('Booking');
    const booking = bookings.find(b => b.bookingId === bookingId);
    
    if (!booking) {
      showAlert('Booking not found.', 'danger');
      return;
    }

    // Update booking status to "Canceled"
    const updatedBooking = {
      bookingId: booking.bookingId,
      classId: booking.classId,
      petId: booking.petId,
      employeeId: booking.employeeId,
      bookingDate: booking.bookingDate,
      status: 'Canceled',
      paymentStatus: booking.paymentStatus,
      amountPaid: booking.amountPaid
    };

    await apiCall(`Booking/${bookingId}`, 'PUT', updatedBooking);
    showAlert('Booking canceled successfully!', 'success');
    
    // Reload customer bookings
    await loadCustomerBookings();
  } catch (error) {
    showAlert(`Error canceling booking: ${error.message}`, 'danger');
  }
}

// ==================== CUSTOMER PETS ====================
async function loadCustomerPetsForView() {
  try {
    // Ensure customer pets are loaded
    await loadCustomerPets();
    
    if (!currentUser || currentUser.userType !== 'customer') {
      document.getElementById('customer-pets-table-body').innerHTML = 
        '<tr><td colspan="7" class="text-center text-danger">Please log in as a customer to view pets.</td></tr>';
      return;
    }

    const tbody = document.getElementById('customer-pets-table-body');
    
    if (customerPets.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No pets found. Click "Add Pet" to create your first pet profile.</td></tr>';
      return;
    }
    
    // Sort by pet ID (or name if preferred)
    customerPets.sort((a, b) => a.petId - b.petId);
    
    tbody.innerHTML = customerPets.map(pet => {
      // Format birthdate
      const birthDate = new Date(pet.birthDate);
      const formattedBirthDate = birthDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      });
      
      return `
        <tr>
          <td>${pet.petId}</td>
          <td>${pet.name}</td>
          <td>${pet.species}</td>
          <td>${pet.breed || '-'}</td>
          <td>${formattedBirthDate}</td>
          <td>${pet.notes || '-'}</td>
          <td>
            <button class="btn btn-sm btn-primary" onclick="editCustomerPet(${pet.petId})">
              <i class="bi bi-pencil"></i> Edit
            </button>
            <button class="btn btn-sm btn-danger" onclick="deleteCustomerPet(${pet.petId})">
              <i class="bi bi-trash"></i> Delete
            </button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    showAlert(`Error loading pets: ${error.message}`, 'danger');
    document.getElementById('customer-pets-table-body').innerHTML = 
      '<tr><td colspan="7" class="text-center text-danger">Error loading data</td></tr>';
  }
}

async function editCustomerPet(id) {
  try {
    // Verify the pet belongs to the logged-in customer
    await loadCustomerPets();
    const pet = customerPets.find(p => p.petId === id);
    
    if (!pet) {
      showAlert('Pet not found or you do not have permission to edit this pet.', 'danger');
      return;
    }
    
    // Open the pet modal with the pet data
    openPetModalForCustomer(pet);
  } catch (error) {
    showAlert(`Error loading pet: ${error.message}`, 'danger');
  }
}

function openPetModalForCustomer(pet = null) {
  const modal = new bootstrap.Modal(document.getElementById('petModal'));
  const form = document.getElementById('petForm');
  form.reset();
  document.getElementById('petId').value = '';
  
  // Auto-fill customer ID for logged-in customer
  if (currentUser && currentUser.userType === 'customer') {
    document.getElementById('petCustomerId').value = currentUser.userId;
    document.getElementById('petCustomerId').disabled = true; // Prevent changing customer ID
  }
  
  if (pet) {
    document.getElementById('petModalTitle').textContent = 'Edit Pet';
    document.getElementById('petId').value = pet.petId;
    document.getElementById('petCustomerId').value = pet.customerId;
    document.getElementById('petCustomerId').disabled = true; // Prevent changing customer ID when editing
    document.getElementById('petName').value = pet.name;
    document.getElementById('petSpecies').value = pet.species;
    document.getElementById('petBreed').value = pet.breed || '';
    // Format birthdate for date input
    const birthDate = new Date(pet.birthDate);
    const year = birthDate.getFullYear();
    const month = String(birthDate.getMonth() + 1).padStart(2, '0');
    const day = String(birthDate.getDate()).padStart(2, '0');
    document.getElementById('petBirthDate').value = `${year}-${month}-${day}`;
    document.getElementById('petNotes').value = pet.notes || '';
  } else {
    document.getElementById('petModalTitle').textContent = 'Add Pet';
  }
  
  modal.show();
  
  // Re-enable customer ID field when modal is hidden (for admin use)
  const modalElement = document.getElementById('petModal');
  modalElement.addEventListener('hidden.bs.modal', function onModalHidden() {
    document.getElementById('petCustomerId').disabled = false;
    modalElement.removeEventListener('hidden.bs.modal', onModalHidden);
  }, { once: true });
}

function deleteCustomerPet(id) {
  // Verify the pet belongs to the logged-in customer
  loadCustomerPets().then(() => {
    const pet = customerPets.find(p => p.petId === id);
    if (!pet) {
      showAlert('Pet not found or you do not have permission to delete this pet.', 'danger');
      return;
    }
    
    currentDeleteId = id;
    currentDeleteEntity = 'Pet';
    currentDeleteCallback = async () => {
      try {
        await apiCall(`Pet/${id}`, 'DELETE');
        showAlert('Pet deleted successfully!');
        // Reload customer pets view
        await loadCustomerPetsForView();
        // Also reload customer pets array for other functions
        await loadCustomerPets();
      } catch (error) {
        showAlert(`Error deleting pet: ${error.message}`, 'danger');
      }
    };
    
    const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
    modal.show();
  }).catch(error => {
    showAlert(`Error: ${error.message}`, 'danger');
  });
}

