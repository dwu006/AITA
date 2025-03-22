import { useState } from "react"
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from "react-native"
import { Feather } from "@expo/vector-icons"

interface FilterModalProps {
  visible: boolean
  onClose: () => void
}

export function FilterModal({ visible, onClose }: FilterModalProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<string>("newest")

  const categories = [
    "Family",
    "Relationships",
    "Work",
    "Money",
    "Roommates",
    "Friends",
    "Weddings",
    "Parenting",
    "In-Laws",
    "Neighbors",
  ]

  const sortOptions = [
    { id: "newest", label: "Newest First" },
    { id: "popular", label: "Most Popular" },
    { id: "controversial", label: "Most Controversial" },
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
    setSortBy("newest")
  }

  const applyFilters = () => {
    // Here you would apply the filters to your data
    // For now, we'll just close the modal
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
                {categories.map((category) => (
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

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sort By</Text>
              {sortOptions.map((option) => (
                <TouchableOpacity key={option.id} style={styles.sortOption} onPress={() => setSortBy(option.id)}>
                  <View style={styles.radioButton}>
                    {sortBy === option.id && <View style={styles.radioButtonSelected} />}
                  </View>
                  <Text style={styles.sortOptionText}>{option.label}</Text>
                </TouchableOpacity>
              ))}
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
  sortOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  radioButton: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#CBD5E0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  radioButtonSelected: {
    height: 10,
    width: 10,
    borderRadius: 5,
    backgroundColor: "#FF4500",
  },
  sortOptionText: {
    fontSize: 16,
    color: "#4A5568",
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