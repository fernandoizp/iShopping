package es.iescarrillo.ishopping;

import androidx.appcompat.app.AppCompatActivity;

import android.content.Intent;
import android.os.Bundle;
import android.widget.Button;
import android.widget.TextView;

public class DetailActivity extends AppCompatActivity {

    private TextView tvProductName, tvProductNote, tvProductStatus;
    private Button btnEdit, btnBack;
    private Producto producto;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_detail);

        Intent intent = getIntent();
        producto = (Producto) intent.getSerializableExtra("producto");

        tvProductName = findViewById(R.id.tvProductName);
        tvProductNote = findViewById(R.id.tvProductNote);
        tvProductStatus = findViewById(R.id.tvProductStatus);
        btnEdit = findViewById(R.id.btnEdit);
        btnBack = findViewById(R.id.btnBack);

        if (producto != null) {
            tvProductName.setText(producto.getNombre());
            tvProductNote.setText(producto.getNotaInformativa());
            tvProductStatus.setText(producto.isEstadoCompra() ? "Estado: Comprado" : "Estado: Pendiente");
        }

        btnBack.setOnClickListener(v -> {
            finish();
        });

        // Si el producto es distinto de nulo, creamos un intent para pasar a editActivity.
        btnEdit.setOnClickListener(v -> {
            if (producto != null) {
                Intent editIntent = new Intent(DetailActivity.this, EditActivity.class);
                editIntent.putExtra("producto", producto);
                startActivity(editIntent);
                finish();
            }
        });
    }
}
