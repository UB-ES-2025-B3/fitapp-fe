describe('Demo Fallo: Validación de Mapa', () => {
  const RANDOM = Date.now();
  const EMAIL = `fail_map_${RANDOM}@test.com`;
  const PASS = 'Pass123!';

  // Ignoramos errores de Mapbox por si acaso
  Cypress.on('uncaught:exception', (err, runnable) => {
    return false;
  });

  beforeEach(() => {
    // 1. Registro y Onboarding
    cy.visit('/register');
    cy.get('#email').type(EMAIL);
    cy.get('#password').type(PASS);
    cy.get('#confirmPassword').type(PASS);
    cy.get('input[type="checkbox"]').check({ force: true });
    cy.get('.submit-btn').click();
    cy.url({ timeout: 20000 }).should('not.include', '/register');

    // Login safety
    cy.get('body').then(($body) => {
        if ($body.find('input#email').length > 0) {
            cy.get('#email').type(EMAIL);
            cy.get('#password').type(PASS);
            cy.get('.submit-btn').click();
        }
    });

    // Onboarding
    cy.get('body').then(($body) => {
        if ($body.find('#firstName').length > 0) {
            cy.get('#firstName').type('Test');
            cy.get('#lastName').type('User');
            cy.get('#birthDate').type('1990-01-01');
            cy.get('#gender').select('male');
            cy.get('#height').type('175');
            cy.get('#weight').type('70');
            cy.get('#goalKcal').clear().type('2000');
            cy.get('.submit-btn').click();
            cy.wait(1000);
        }
    });
  });

  it('FALLO INTENCIONAL: Debe fallar al intentar guardar sin puntos en el mapa', () => {
    // 1. Ir a crear ruta
    cy.visit('/routes/new');
    
    // 2. Rellenar SOLO el nombre
    cy.get('input[placeholder*="Nombre"]').type('Ruta Sin Mapa (Fallo)');
    
    // 3. [LA TRAMPA] NO hacemos clic en el mapa.
    // Saltamos directamente a guardar.
    cy.contains('button', 'Guardar ruta').click();

    // Le decimos a Cypress: "Espero ver la lista de rutas ahora".
    // REALIDAD: La app muestra un error y se queda en el formulario.
    // RESULTADO: Cypress espera 4 segundos, no ve la lista, FALLA y toma la foto.
    cy.get('.routes-list').should('be.visible');
  });
});