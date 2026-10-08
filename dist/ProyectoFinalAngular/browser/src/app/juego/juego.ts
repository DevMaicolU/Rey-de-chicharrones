import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
@Component({
  selector: 'app-juego',
  imports: [CommonModule],
  templateUrl: './juego.html',
  styleUrl: './juego.css',
})
export class Juego implements OnInit {
  posicionTabla1: number = 0
  posicionTabla2: number = 0
  verificar1: boolean=false
  verificar2: boolean=false

  mensaje: String = ""
  mensaje2: String = ""
  mostrarModal: boolean = false

  constructor(private cd: ChangeDetectorRef) {

  }

  ngOnInit(): void {
    while (this.posicionTabla1 == this.posicionTabla2) {
      this.posicionTabla1 = Math.floor(Math.random() * 16) + 1; //Numero random entre 1 y 3
      this.posicionTabla2 = Math.floor(Math.random() * 16) + 1; //Numero random entre 1 y 3
    }
    this.mensaje = ""
    this.cd.detectChanges()
    this.cd.detectChanges()

  }

  async descubrirTabla(p: number) {
    if (this.posicionTabla1 == p) {
      const Imagen1 = document.getElementById("imgTabla" + p) as HTMLImageElement
      Imagen1.src = "Images/Coctel.png"
      this.verificar1=true
    } else if (this.posicionTabla2 == p) {
      const Imagen2 = document.getElementById("imgTabla" + p) as HTMLImageElement
      Imagen2.src = "Images/Lasagna.png"
      this.verificar2=true
    } else {
        const fondoBlanco = document.getElementById("imgTabla" + p) as HTMLImageElement
      fondoBlanco.src = "Images/CuadroBlanco.png"

    }

    if (this.verificar1==true && this.verificar2==true) {
      this.mensaje2 = "¡Encontraste las imágenes!"
      this.mostrarModal = true
      this.posicionTabla1 = 0
      this.posicionTabla2 = 0
      this.verificar1=false
      this.verificar2=false
      await new Promise(resolve => setTimeout(resolve, 2000))
      this.cerrarModal()

    }

  }

  cerrarModal() {
    this.mostrarModal = false
    this.reiniciarTabla()
  }

  reiniciarTabla() {
    var contador: number = 1
    this.mensaje2 = ""
    while (this.posicionTabla1 == this.posicionTabla2) {
      this.posicionTabla1 = Math.floor(Math.random() * 16) + 1; //Numero random entre 1 y 16
      this.posicionTabla2 = Math.floor(Math.random() * 16) + 1; //Numero random entre 1 y 16
    }

    while (contador <= 16) {
      const bolita = document.getElementById("imgTabla" + contador) as HTMLImageElement
      bolita.src = "Images/Interrogacion.png"
      contador += 1
    }
    this.cd.detectChanges()
    this.cd.detectChanges()


  }

}