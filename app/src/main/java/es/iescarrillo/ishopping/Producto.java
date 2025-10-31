package es.iescarrillo.ishopping;

import java.io.Serializable;

public class Producto implements Serializable {
    int id;
    String nombre;
    String notaInformativa;
    boolean estadoCompra;

    public Producto(){}
    public Producto(int id, String nombre, String notaInformativa, boolean estadoCompra){
        this.id = id;
        this.nombre = nombre;
        this.notaInformativa = notaInformativa;
        this.estadoCompra = estadoCompra;
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getNotaInformativa() {
        return notaInformativa;
    }

    public void setNotaInformativa(String notaInformativa) {
        this.notaInformativa = notaInformativa;
    }

    public boolean isEstadoCompra() {
        return estadoCompra;
    }

    public void setEstadoCompra(boolean estadoCompra) {
        this.estadoCompra = estadoCompra;
    }

    @Override
    public String toString() {
        return nombre;
    }
}