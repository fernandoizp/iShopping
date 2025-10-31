package es.iescarrillo.ishopping;

import static es.iescarrillo.ishopping.Productos.productos;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.Spinner;
import android.widget.Toast;

import androidx.activity.EdgeToEdge;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

public class MainActivity extends AppCompatActivity implements AdapterView.OnItemSelectedListener {

    public Producto productoSeleccionado;
    public Button btnSeeDetails, btnAddProduct, btnAddPending;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);
        setContentView(R.layout.activity_main);
        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main), (v, insets) -> {
            Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom);
            return insets;
        });

        llenarSpinner();

        // Asignamos los botones del layout a las variables
        btnSeeDetails = findViewById(R.id.seeButton);
        btnAddProduct = findViewById(R.id.addButton);
        btnAddPending = findViewById(R.id.pendList);

        // Listener para el botón "Ver Detalles"
        btnSeeDetails.setOnClickListener(v -> {
            if (productoSeleccionado != null) {
                Intent intent = new Intent(MainActivity.this, DetailActivity.class);
                intent.putExtra("producto", productoSeleccionado);
                startActivity(intent);
            } else {
                Toast.makeText(this, "Por favor, selecciona un producto primero", Toast.LENGTH_SHORT).show();
            }
        });

        // Listener para el botón "Añadir Producto"
        btnAddProduct.setOnClickListener(v -> {
            Intent intent = new Intent(MainActivity.this, AddActivity.class);
            startActivity(intent);
        });

        // Listener para el botón "Añadir a Pendientes"
        btnAddPending.setOnClickListener(v -> {
            Intent intent = new Intent(MainActivity.this, AddPendingActivity.class);
            startActivity(intent);
        });
    }

    public void llenarSpinner(){
        Spinner spinner = findViewById(R.id.spinner);

        if (productos.isEmpty()) {
            productos.add(new Producto(1, "Leche", "Pack de 6", false));
            productos.add(new Producto(2, "Pan", "Molde, integral", false));
            productos.add(new Producto(3, "Huevos", "Docena", true));
        }

        ArrayAdapter<Producto> adaptador = new ArrayAdapter<>(this, android.R.layout.simple_spinner_item, productos);
        adaptador.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        spinner.setAdapter(adaptador);

        spinner.setOnItemSelectedListener(this);


    }

    @Override
    public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
        this.productoSeleccionado = (Producto) parent.getItemAtPosition(position);
    }

    @Override
    public void onNothingSelected(AdapterView<?> parent) {
        this.productoSeleccionado = null;
    }
}