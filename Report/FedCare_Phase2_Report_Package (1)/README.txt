FedCare-AI Phase-II Report Package

Folder layout:
    report/Project_Phase-II-Report.tex
    fig/                         -> VTU/Sahyadri and supplied images
    FedAvg/                      -> put the actual FedAvg result figures here
    FedProx/                     -> put the actual FedProx result figures here

The report uses \IfFileExists for experimental figures, so the LaTeX file
will still compile if those result images have not yet been copied.

Expected experiment-image filenames referenced by the report:
FedAvg/
  graph_global_val_accuracy_loss_densenet_se_fedavg.png
  rsna_test_densenet_se_fedavg_confusion_matrix.png
  rsna_test_densenet_se_fedavg_roc_curve.png
  correct_normal.png
  correct_pneumonia.png
  incorrect_prediction.png

FedProx/
  graph_global_val_accuracy_loss_densenet_se_fedprox.png
  rsna_test_densenet_se_fedprox_confusion_matrix.png
  rsna_test_densenet_se_fedprox_roc_curve.png
  gradcam_densenet_se_fedprox_correct_normal_1.png
  gradcam_densenet_se_fedprox_correct_pneumonia_1.png
  gradcam_densenet_se_fedprox_incorrect_prediction_1.png

Important:
Project.png supplied with the Phase-I materials is a conceptual architecture
that references CheXpert/NIH/VinDr. The current Phase-II report is based on the
research-paper experiment using RSNA + three simulated clients + an independent
Labeled Chest X-ray Images dataset. Replace Project.png with the final
project-specific architecture figure before submission if the department
requires an architecture image.
