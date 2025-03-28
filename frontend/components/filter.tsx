import { useState } from "react"
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from "react-native"
import { Feather } from "@expo/vector-icons"

interface FilterModalProps {
  visible: boolean
  onClose: () => void
}

export function FilterModal({ visible, onClose }: FilterModalProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  const categoryOptions = [
    "Relationships",
    "Work",
    "Money",
    "Roommates",
    "Friends",
    "School",
    "Weddings",
    "Parenting",
    "In-Laws",
    "Public",
    "Revenge",
    "Neighbors",
  ]

  const toggleCategory = (category: string) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== category))
    } else {
      setSelectedCategories([...selectedCategories, category])
    }
  }

  const resetFilters = () => {
    setSelectedCategories([])
  }

  const applyFilters = () => {
    onClose()
  }

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Posts</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={24} color="#4A5568" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Categories</Text>
              <View style={styles.categoriesContainer}>
                {categoryOptions.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[styles.categoryChip, selectedCategories.includes(category) && styles.categoryChipSelected]}
                    onPress={() => toggleCategory(category)}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        selectedCategories.includes(category) && styles.categoryChipTextSelected,
                      ]}
                    >
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={[styles.button, styles.buttonOutline]} onPress={resetFilters}>
              <Text style={styles.buttonOutlineText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.buttonFilled]} onPress={applyFilters}>
              <Text style={styles.buttonFilledText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalView: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2D3748",
  },
  modalContent: {
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4A5568",
    marginBottom: 12,
  },
  categoriesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  categoryChip: {
    backgroundColor: "#EDF2F7",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  categoryChipSelected: {
    backgroundColor: "#FF4500",
  },
  categoryChipText: {
    fontSize: 14,
    color: "#4A5568",
  },
  categoryChipTextSelected: {
    color: "#FFFFFF",
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    alignItems: "center",
  },
  buttonOutline: {
    borderWidth: 1,
    borderColor: "#CBD5E0",
    marginRight: 10,
  },
  buttonFilled: {
    backgroundColor: "#FF4500",
  },
  buttonOutlineText: {
    color: "#4A5568",
    fontWeight: "600",
  },
  buttonFilledText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
})

export default FilterModal;