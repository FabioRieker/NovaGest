import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  AsyncValidatorFn,
  ValidationErrors
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonContent,
  IonSelect,
  IonSelectOption,
  IonButton,
  IonIcon,
  IonSpinner
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  saveOutline,
  closeOutline,
  cubeOutline,
  pricetagOutline,
  mailOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  logOutOutline,
  cashOutline,
  layersOutline,
  gridOutline,
  documentTextOutline,
  imageOutline,
  cloudUploadOutline,
  trashOutline
} from 'ionicons/icons';
import { Observable, timer } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { SqlRestService } from '../../core/services/sql-rest.service';
import { StorageService } from '../../core/services/storage.service';
import { NotificationService } from '../../core/services/notification.service';
import { SupabaseRealtimeService } from '../../core/services/supabase-realtime.service';
import { ProductCategory, StockStatus } from '../../core/models/product.model';

/**
 * Validador Asíncrono contra Servicio (FASE 1 - Paso 1.2 & RA 2).
 * Verifica en segundo plano contra la API SQL si el SKU ya existe en la base de datos,
 * aplicando debounce para evitar sobrecarga de consultas.
 */
export function skuAsyncValidator(sqlService: SqlRestService, excludeId?: string): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    if (!control.value || control.value.trim().length < 3) {
      return new Observable(obs => obs.next(null));
    }

    return timer(400).pipe(
      switchMap(() => sqlService.checkSkuExists(control.value, excludeId)),
      map(exists => (exists ? { skuExists: true } : null))
    );
  };
}

/**
 * Formulario Reactivo de Creación y Edición de Registros (FASE 1 & RA 2).
 * Demuestra separación estricta de lógica y vista, validaciones síncronas y asíncronas,
 * estados dirty/touched y gestión de errores de accesibilidad UX avanzada.
 */
@Component({
  selector: 'app-product-form',
  templateUrl: './product-form.page.html',
  styleUrls: ['./product-form.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonSelect,
    IonSelectOption,
    IonButton,
    IonIcon,
    IonSpinner
  ]
})
export class ProductFormPage implements OnInit {
  private fb = inject(FormBuilder);
  private sqlService = inject(SqlRestService);
  private storageService = inject(StorageService);
  private notificationService = inject(NotificationService);
  private realtimeService = inject(SupabaseRealtimeService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  public productForm!: FormGroup;
  public isEditMode = signal(false);
  public productId = signal<string | null>(null);
  public isSaving = signal(false);
  public isUploadingImage = signal(false);
  public imagePreviewUrl = signal<string | null>(null);

  public categories: ProductCategory[] = ['Hardware', 'Electrónica', 'Mobiliario', 'Servicios', 'Papelería'];

  constructor() {
    addIcons({
      saveOutline,
      closeOutline,
      cubeOutline,
      pricetagOutline,
      mailOutline,
      checkmarkCircleOutline,
      alertCircleOutline,
      logOutOutline,
      cashOutline,
      layersOutline,
      gridOutline,
      documentTextOutline,
      imageOutline,
      cloudUploadOutline,
      trashOutline
    });
  }

  public logout(): void {
    this.authService.logout();
    this.notificationService.showToast('Sesión cerrada correctamente.', 'primary');
    this.router.navigate(['/login']);
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.productId.set(id);
    }

    this.initForm();

    if (this.isEditMode() && id) {
      this.loadExistingProduct(id);
    }
  }

  private initForm(): void {
    this.productForm = this.fb.group({
      sku: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(15),
          Validators.pattern(/^[A-Z0-9-]+$/i)
        ],
        [skuAsyncValidator(this.sqlService, this.productId() || undefined)]
      ],
      name: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(70)]],
      category: ['Hardware', [Validators.required]],
      price: [null, [Validators.required, Validators.min(0.01), Validators.max(100000)]],
      stock: [0, [Validators.required, Validators.min(0), Validators.max(10000)]],
      supplierEmail: ['', [Validators.required, Validators.email]],
      imageUrl: [''],
      description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]]
    });
  }

  private loadExistingProduct(id: string): void {
    this.sqlService.getProductById(id).subscribe({
      next: (product) => {
        this.productForm.patchValue({
          sku: product.sku,
          name: product.name,
          category: product.category,
          price: product.price,
          stock: product.stock,
          supplierEmail: product.supplierEmail,
          imageUrl: product.imageUrl || '',
          description: product.description
        });
        if (product.imageUrl) {
          this.imagePreviewUrl.set(product.imageUrl);
        }
      },
      error: () => {
        this.notificationService.showToast('No se pudo encontrar el producto solicitado.', 'danger');
        this.router.navigate(['/products']);
      }
    });
  }

  public async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];

    if (!file.type.startsWith('image/')) {
      this.notificationService.showToast('Por favor seleccione un archivo de imagen válido (JPG, PNG, WEBP).', 'warning');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.notificationService.showToast('La imagen no debe superar los 5 MB.', 'warning');
      return;
    }

    this.isUploadingImage.set(true);
    try {
      const sku = this.productForm.get('sku')?.value || 'producto';
      const uploadedUrl = await this.storageService.uploadProductImage(file, sku);
      if (uploadedUrl) {
        this.productForm.patchValue({ imageUrl: uploadedUrl });
        this.imagePreviewUrl.set(uploadedUrl);
        this.notificationService.showToast('Fotografía subida al bucket product-images.', 'success');
      }
    } catch (err: any) {
      this.notificationService.showToast('Error al procesar la imagen: ' + (err.message || 'desconocido'), 'danger');
    } finally {
      this.isUploadingImage.set(false);
      input.value = '';
    }
  }

  public removeImage(): void {
    this.productForm.patchValue({ imageUrl: '' });
    this.imagePreviewUrl.set(null);
  }

  public onSubmit(): void {
    if (this.productForm.invalid || this.productForm.pending) {
      this.productForm.markAllAsTouched();
      setTimeout(() => {
        const firstInvalid = document.querySelector('.form-input-item.ion-invalid input, input.ng-invalid, [aria-invalid="true"]');
        (firstInvalid as HTMLElement)?.focus?.();
      }, 50);
      return;
    }

    this.isSaving.set(true);
    const formVal = this.productForm.value;

    const stockNumber = Number(formVal.stock);
    let calculatedStatus: StockStatus = 'in_stock';
    if (stockNumber === 0) {
      calculatedStatus = 'out_of_stock';
    } else if (stockNumber < 5) {
      calculatedStatus = 'low_stock';
    }

    const payload = {
      sku: formVal.sku.toUpperCase().trim(),
      name: formVal.name.trim(),
      category: formVal.category,
      price: Number(formVal.price),
      stock: stockNumber,
      status: calculatedStatus,
      supplierEmail: formVal.supplierEmail.trim().toLowerCase(),
      imageUrl: formVal.imageUrl ? formVal.imageUrl.trim() : undefined,
      description: formVal.description.trim()
    };

    if (this.isEditMode() && this.productId()) {
      this.sqlService.updateProduct(this.productId()!, payload).subscribe({
        next: (updated) => {
          this.isSaving.set(false);
          this.notificationService.showToast(`Producto '${updated.name}' actualizado con éxito.`, 'success');
          this.realtimeService.logActivity(
            'UPDATE',
            'PRODUCT',
            `Actualización del producto SKU: ${updated.sku} (${updated.name})`,
            'info',
            updated.id
          );
          this.router.navigate(['/products']);
        },
        error: (err) => {
          this.isSaving.set(false);
          this.notificationService.showToast(err.message || 'Error al actualizar el producto.', 'danger');
        }
      });
    } else {
      this.sqlService.createProduct(payload).subscribe({
        next: (created) => {
          this.isSaving.set(false);
          this.notificationService.showToast(`Producto '${created.name}' registrado exitosamente.`, 'success');
          this.realtimeService.logActivity(
            'CREATE',
            'PRODUCT',
            `Alta de nuevo producto SKU: ${created.sku} (${created.name})`,
            'success',
            created.id
          );
          this.router.navigate(['/products']);
        },
        error: (err) => {
          this.isSaving.set(false);
          this.notificationService.showToast(err.message || 'Error al crear el producto.', 'danger');
        }
      });
    }
  }

  public cancel(): void {
    this.router.navigate(['/products']);
  }
}
