package es.iescarrillo.ishopping;

import androidx.appcompat.app.AppCompatActivity;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.Spinner;
import android.widget.Toast;

import java.util.ArrayList;
import java.util.List;

public class AddPendingActivity extends AppCompatActivity {

    private Spinner spinnerPurchased;
    private Button btnSave, btnCancel;
    private Producto productoSeleccionado;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_add_pending);

        spinnerPurchased = findViewById(R.id.spinnerPurchased);
        btnSave = findViewById(R.id.btnSave);
        btnCancel = findViewById(R.id.btnCancel);

        // Filtrar productos comprados
        List<Producto> productosComprados = new ArrayList<>();
        for (Producto p : Productos.productos) {
            if (p.isEstadoCompra()) { // Si el estado es 'true' (comprado)
                productosComprados.add(p);
            }
        }

        // Adaptador para el Spinner
        ArrayAdapter<Producto> adapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_item, productosComprados);
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        spinnerPurchased.setAdapter(adapter);

        // Listener para saber qué producto se selecciona
        spinnerPurchased.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @Override
            public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
                productoSeleccionado = (Producto) parent.getItemAtPosition(position);
            }

            @Override
            public void onNothingSelected(AdapterView<?> parent) {
                productoSeleccionado = null;
            }
        });

        btnSave.setOnClickListener(v -> {
            if (productoSeleccionado != null) {
                // Buscar el producto en la lista global y cambiar su estado
                for (Producto p : Productos.productos) {
                    if (p.getId() == productoSeleccionado.getId()) {
                        p.setEstadoCompra(false); // Marcar como pendiente
                        break;
                    }
                }
                Toast.makeText(this, productoSeleccionado.getNombre() + " añadido a pendientes", Toast.LENGTH_SHORT).show();

                // Volver a la actividad principal
                Intent mainIntent = new Intent(AddPendingActivity.this, MainActivity.class);
                startActivity(mainIntent);
                finish();

            } else {
                Toast.makeText(this, "No hay productos comprados para añadir a pendientes", Toast.LENGTH_SHORT).show();
            }
        });

        // Boton cancelar
        btnCancel.setOnClickListener(v -> {
            finish();
        });

    }
}
