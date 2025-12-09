describe('Gestión de Perfil de Usuario', () => {
  // Usamos un email aleatorio para que no choque si ejecutas el test varias veces
  const RANDOM_ID = Math.floor(Math.random() * 100000);
  const USER_EMAIL = `profile_test_${RANDOM_ID}@test.com`;
  const USER_PASS = 'Password123!';

  beforeEach(() => {
    // 1. REGISTRO NUEVO (Para asegurar que el usuario existe)
    cy.visit('/register');
    cy.get('#email').type(USER_EMAIL);
    cy.get('#password').type(USER_PASS);
    cy.get('#confirmPassword').type(USER_PASS);
    cy.get('input[type="checkbox"]').check({ force: true });
    cy.get('.submit-btn').click();

    // 2. Esperar redirección (puede ir al onboarding o home)
    cy.url({ timeout: 20000 }).should('not.include', '/register');
    
    // Si redirige a Login, hacemos login. Si entra directo, seguimos.
    cy.get('body').then(($body) => {
        if ($body.find('input#email').length > 0) {
            cy.get('#email').type(USER_EMAIL);
            cy.get('#password').type(USER_PASS);
            cy.get('.submit-btn').click();
        }
    });

    // 3. Rellenar Onboarding si aparece (necesario para editar perfil luego)
    cy.get('body').then(($body) => {
        if ($body.find('#firstName').length > 0) {
            cy.get('#firstName').type('Test');
            cy.get('#lastName').type('User');
            cy.get('#birthDate').type('1990-01-01');
            cy.get('#gender').select('male');
            cy.get('#height').type('180');
            cy.get('#weight').type('80');
            cy.get('#goalKcal').clear().type('2000');
            cy.get('.submit-btn').click();
        }
    });
  });

  it('Permite editar objetivos y datos personales', () => {
    // Ahora sí estamos seguros de que estamos dentro
    cy.visit('/profile');
    cy.get('.profile-card').should('be.visible');
    
    // Modificar datos
    cy.get('#goalKcal').clear().type('2500');
    // Guardar
    cy.contains('button', 'Guardar cambios').click();
    
    // Validar (ajusta según tu feedback visual, ej: toast o alert)
    // Si no hay alert, verificamos que no haya error
    cy.get('.error-box').should('not.exist');
  });
});