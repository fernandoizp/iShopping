package es.iescarrillo.ishopping;

import androidx.appcompat.app.AppCompatActivity;

import android.content.Intent;
import android.os.Bundle;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Switch;
import android.widget.Toast;

public class AddActivity extends AppCompatActivity {

    private EditText etProductName, etProductNote;
    private Switch swPurchasedStatus;
    private Button btnSave, btnCancel;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_add);

        etProductName = findViewById(R.id.etProductName);
        etProductNote = findViewById(R.id.etProductNote);
        swPurchasedStatus = findViewById(R.id.swPurchasedStatus);
        btnSave = findViewById(R.id.btnSave);
        btnCancel = findViewById(R.id.btnCancel);

        // Listener boton guardar
        btnSave.setOnClickListener(v -> {
            String name = etProductName.getText().toString();
            String note = etProductNote.getText().toString();
            boolean status = swPurchasedStatus.isChecked();

            if (name.isEmpty()) {
                Toast.makeText(this, "El nombre no puede estar vacío", Toast.LENGTH_SHORT).show();
                return; // No continuar si el nombre está vacío
            }

            // Crear un ID único para el nuevo producto
            int newId = 1;
            if (!Productos.productos.isEmpty()) {
                newId = Productos.productos.get(Productos.productos.size() - 1).getId() + 1;
            }

            Producto newProduct = new Producto(newId, name, note, status);
            Productos.productos.add(newProduct);

            Toast.makeText(this, "Producto añadido correctamente", Toast.LENGTH_SHORT).show();

            Intent mainIntent = new Intent(AddActivity.this, MainActivity.class);

            startActivity(mainIntent);
            finish();
        });

        // Listener boton cancelar
        btnCancel.setOnClickListener(v -> {
            // Cierra la actividad y vuelve al main
            finish();
        });
    }
}
