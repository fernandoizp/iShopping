package es.iescarrillo.ishopping;

import androidx.appcompat.app.AppCompatActivity;

import android.content.Intent;
import android.os.Bundle;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Switch;
import android.widget.Toast;

public class EditActivity extends AppCompatActivity {

    private EditText etProductName, etProductNote;
    private Switch swPurchasedStatus;
    private Button btnSave, btnCancel;
    private Producto productoToEdit;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_edit);

        // Recuperar el producto del intent
        Intent intent = getIntent();
        productoToEdit = (Producto) intent.getSerializableExtra("producto");

        etProductName = findViewById(R.id.etProductName);
        etProductNote = findViewById(R.id.etProductNote);
        swPurchasedStatus = findViewById(R.id.swPurchasedStatus);
        btnSave = findViewById(R.id.btnSave);
        btnCancel = findViewById(R.id.btnCancel);

        if (productoToEdit != null) {
            etProductName.setText(productoToEdit.getNombre());
            etProductNote.setText(productoToEdit.getNotaInformativa());
            swPurchasedStatus.setChecked(productoToEdit.isEstadoCompra());
        }

        // OnClick listener boton guardar
        btnSave.setOnClickListener(v -> {
            String newName = etProductName.getText().toString();
            String newNote = etProductNote.getText().toString();
            boolean newStatus = swPurchasedStatus.isChecked();

            if (newName.isEmpty()) {
                Toast.makeText(this, "El nombre no puede estar vacío", Toast.LENGTH_SHORT).show();
                return; // No continuar si el nombre está vacío
            }

            // Actualizar el producto en la lista estática global
            for (Producto p : Productos.productos) {
                if (p.getId() == productoToEdit.getId()) {
                    p.setNombre(newName);
                    p.setNotaInformativa(newNote);
                    p.setEstadoCompra(newStatus);
                    break; // Salir del bucle una vez encontrado y actualizado
                }
            }

            Toast.makeText(this, "Producto actualizado", Toast.LENGTH_SHORT).show();
            Intent mainIntent = new Intent(EditActivity.this, MainActivity.class);
            startActivity(mainIntent);
            finish();
        });

        btnCancel.setOnClickListener(v -> {
            finish();
        });
    }
}
